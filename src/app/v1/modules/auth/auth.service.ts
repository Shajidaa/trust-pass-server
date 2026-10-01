import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { auth } from "../../../libs/auth";
import { prisma } from "../../../libs/prisma";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterUserPayload,
} from "./auth.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  status: true,
  gender: true,
  phone: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const extractSetCookies = (headers: Headers): string[] =>
  (headers as any).getSetCookie?.() ?? [];

const resolveTokens = async (token: string) => {
  const session = await prisma.session.findUnique({
    where: { token },
    select: { token: true, expiresAt: true },
  });
  return {
    accessToken: token,
    refreshToken: session?.token ?? token,
    expiresAt: session?.expiresAt ?? null,
  };
};

// ---------------------------------------------------------------------------
// Register — Step 1
// ---------------------------------------------------------------------------

const registerUser = async (payload: IRegisterUserPayload) => {
  const email = payload.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this email already exists.",
    );
  }

  const response = await auth.api.signUpEmail({
    body: {
      name: payload.name,
      email,
      password: payload.password,
      image: payload.image,
      phone: payload.phone,
      gender: payload.gender,
      role: payload.role ?? "CUSTOMER",
    },
    asResponse: true,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.INTERNAL_SERVER_ERROR,
      data?.message ?? "Registration failed. Please try again.",
    );
  }

  // Persist extra fields
  await prisma.user.update({
    where: { id: data.user.id },
    data: {
      ...(payload.phone ? { phone: payload.phone } : {}),
      ...(payload.gender ? { gender: payload.gender } : {}),
      ...(payload.role ? { role: payload.role } : {}),
      provider: "CREDENTIAL",
    },
  });

  return {
    email,
    message:
      "Account created. A 6-digit verification code has been sent to your email.",
  };
};

// ---------------------------------------------------------------------------
// Verify OTP — Step 2 (auto-login)
// ---------------------------------------------------------------------------

const verifyEmailOtp = async (email: string, otp: string) => {
  const response = await auth.api.verifyEmailOTP({
    body: { email, otp },
    asResponse: true,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      data?.message ?? "Invalid or expired OTP. Please request a new one.",
    );
  }

  const [user, tokens] = await Promise.all([
    data.user?.id
      ? prisma.user.findUnique({
          where: { id: data.user.id },
          select: SAFE_USER_SELECT,
        })
      : null,
    data.token ? resolveTokens(data.token) : null,
  ]);

  return {
    responseHeaders: response.headers,
    data: {
      message: "Email verified. You are now signed in.",

      ...(tokens ?? {}),
    },
  };
};

// ---------------------------------------------------------------------------
// Resend OTP
// ---------------------------------------------------------------------------

const resendOtp = async (email: string) => {
  const normalised = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalised },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return {
      message:
        "If that address has a pending account, a new OTP has been sent.",
    };
  }

  if (user.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This email is already verified.",
    );
  }

  const response = await auth.api.sendVerificationOTP({
    body: { email: normalised, type: "email-verification" },
    asResponse: true,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.INTERNAL_SERVER_ERROR,
      data?.message ?? "Failed to send OTP.",
    );
  }

  return { message: "A new verification code has been sent to your email." };
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const loginUser = async (
  payload: ILoginUserPayload,
  headers: Headers | any,
) => {
  const email = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, status: true },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  if (!user.emailVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Please verify your email before signing in. Check your inbox for the OTP.",
    );
  }

  const STATUS_ERRORS: Partial<Record<string, [number, string]>> = {
    BLOCKED: [
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact support.",
    ],
    SUSPENDED: [httpStatus.FORBIDDEN, "Your account is currently suspended."],
    DELETED: [httpStatus.UNAUTHORIZED, "This account no longer exists."],
  };

  const statusErr = STATUS_ERRORS[user.status];
  if (statusErr) throw new AppError(statusErr[0], statusErr[1]);

  const response = await auth.api.signInEmail({
    body: { email: payload.email, password: payload.password },
    headers,
    asResponse: true,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.UNAUTHORIZED,
      data?.message ?? "Invalid email or password.",
    );
  }

  const [safeUser, tokens] = await Promise.all([
    prisma.user.findUnique({
      where: { id: data.user.id },
      select: SAFE_USER_SELECT,
    }),
    resolveTokens(data.token),
  ]);

  return {
    responseHeaders: response.headers,
    data: { ...tokens },
  };
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

const logoutUser = async (headers: Headers | any) => {
  const response = await auth.api.signOut({ headers, asResponse: true });
  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      data?.message ?? "Logout failed.",
    );
  }

  return { responseHeaders: response.headers, data };
};

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------

const changePassword = async (
  payload: IChangePasswordPayload,
  headers: Headers | any,
) => {
  const response = await auth.api.changePassword({
    body: {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      revokeOtherSessions: payload.revokeOtherSessions ?? true,
    },
    headers,
    asResponse: true,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      data?.message ?? "Failed to change password.",
    );
  }

  return { responseHeaders: response.headers, data };
};

// ---------------------------------------------------------------------------

export const AuthService = {
  registerUser,
  verifyEmailOtp,
  resendOtp,
  loginUser,
  logoutUser,
  changePassword,
};

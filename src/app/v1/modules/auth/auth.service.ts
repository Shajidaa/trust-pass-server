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

    refreshToken: session?.token,
    expiresAt: session?.expiresAt ?? null,
  };
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

const registerUser = async (payload: IRegisterUserPayload) => {
  const email = payload.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "An account with this email already exists.");
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

  // Better Auth returns { token: string, user: User }
  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.INTERNAL_SERVER_ERROR,
      data?.message ?? "Registration failed. Please try again.",
    );
  }

  // Persist extra fields Better Auth doesn't write through signUpEmail body
  await prisma.user.update({
    where: { id: data.user.id },
    data: {
      ...(payload.phone ? { phone: payload.phone } : {}),
      ...(payload.gender ? { gender: payload.gender } : {}),
      ...(payload.role ? { role: payload.role } : {}),
      provider: "CREDENTIAL",
    },
  });

  const [user, tokens] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.user.id }, select: SAFE_USER_SELECT }),
    resolveTokens(data.token),
  ]);

  return {
    responseHeaders: response.headers,
    data: { ...tokens },
  };
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const loginUser = async (payload: ILoginUserPayload, headers: Headers | any) => {
  const email = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  const STATUS_ERRORS: Partial<Record<string, [number, string]>> = {
    BLOCKED: [httpStatus.FORBIDDEN, "Your account has been blocked. Please contact support."],
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

  // Better Auth returns { token: string, user: User }
  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.UNAUTHORIZED,
      data?.message ?? "Invalid email or password.",
    );
  }

  const [safeUser, tokens] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.user.id }, select: SAFE_USER_SELECT }),
    resolveTokens(data.token),
  ]);

  return {
    responseHeaders: response.headers,
    data: { ...tokens },
  };
};

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,

    },
  });


  return user;
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
// Change password
// ---------------------------------------------------------------------------

const changePassword = async (payload: IChangePasswordPayload, headers: Headers | any) => {

};

// ---------------------------------------------------------------------------

export const AuthService = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  changePassword,
};

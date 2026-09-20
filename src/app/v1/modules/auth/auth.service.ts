import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { auth } from "../../../libs/auth";
import { prisma } from "../../../libs/prisma";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterUserPayload,
} from "./auth.interface";

/**
 * Register a new user using Better Auth and persist custom ERD attributes
 */
const registerUser = async (
  payload: IRegisterUserPayload,
  headers: Headers | any,
) => {
  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A user with this email address already exists.",
    );
  }

  // 2. Call Better Auth API to create credentials and session
  const response = await auth.api.signUpEmail({
    body: {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      image: payload.image,
      phone: payload.phone,
      gender: payload.gender,
      role: payload.role || "CUSTOMER",
      provider: "CREDENTIAL",
    },
    headers,
    asResponse: true,
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      responseData.message || "Registration failed.",
    );
  }

  // 3. Ensure custom database fields are synchronized
  const updatedUser = await prisma.user.update({
    where: { id: responseData.user.id },
    data: {
      phone: payload.phone ?? undefined,
      gender: payload.gender ?? undefined,
      role: payload.role ?? "CUSTOMER",
      status: "ACTIVE",
      provider: "CREDENTIAL",
    },
    select: {
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
    },
  });

  return {
    responseHeaders: response.headers,
    data: {
      user: updatedUser,
      token: responseData.token,
      session: responseData.session,
    },
  };
};

/**
 * Log in an existing user using Better Auth
 */
const loginUser = async (
  payload: ILoginUserPayload,
  headers: Headers | any,
) => {
  // 1. Check user status before authenticating
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid email or password.",
    );
  }

  if (user.status === "BLOCKED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact customer support.",
    );
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is currently suspended.",
    );
  }

  if (user.status === "DELETED") {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "This account has been deleted.",
    );
  }

  // 2. Call Better Auth signInEmail
  const response = await auth.api.signInEmail({
    body: {
      email: payload.email,
      password: payload.password,
    },
    headers,
    asResponse: true,
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.UNAUTHORIZED,
      responseData.message || "Invalid email or password.",
    );
  }

  // 3. Fetch clean user record without exposing sensitive fields
  const safeUser = await prisma.user.findUnique({
    where: { id: responseData.user.id },
    select: {
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
    },
  });

  return {
    responseHeaders: response.headers,
    data: {
      user: safeUser,
      token: responseData.token,
      session: responseData.session,
    },
  };
};

/**
 * Get current authenticated user session & profile
 */
const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
      sessions: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          createdAt: true,
          ipAddress: true,
          userAgent: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found.");
  }

  return user;
};

/**
 * Sign out and invalidate session
 */
const logoutUser = async (headers: Headers | any) => {
  const response = await auth.api.signOut({
    headers,
    asResponse: true,
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      responseData.message || "Failed to sign out.",
    );
  }

  return {
    responseHeaders: response.headers,
    data: responseData,
  };
};

/**
 * Change password for authenticated user
 */
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

  const responseData = await response.json();

  if (!response.ok) {
    throw new AppError(
      response.status || httpStatus.BAD_REQUEST,
      responseData.message || "Failed to change password.",
    );
  }

  return {
    responseHeaders: response.headers,
    data: responseData,
  };
};

export const AuthService = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  changePassword,
};

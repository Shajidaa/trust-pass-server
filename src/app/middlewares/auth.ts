import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { auth as betterAuthInstance } from "../libs/auth";
import { prisma } from "../libs/prisma";

export const auth = (...requiredRoles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Get session from Better Auth using request headers (cookies or bearer token)
      const sessionData = await betterAuthInstance.api.getSession({
        headers: req.headers as unknown as Headers,
      });

      if (!sessionData || !sessionData.user) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "You are not authenticated. Please log in to continue.",
        );
      }

      // 2. Fetch fresh user status from database to enforce real-time status & role checks
      const user = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
      });

      if (!user) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "User account associated with this session no longer exists.",
        );
      }

      // 3. Enforce account status restrictions
      if (user.status === "BLOCKED") {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "Your account has been blocked. Please contact support.",
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

      // 4. Role-Based Access Control (RBAC)
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You do not have permission to access this resource.",
        );
      }

      // 5. Attach verified user and session to request
      req.user = user;
      req.session = sessionData.session as any;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;

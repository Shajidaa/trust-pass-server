import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { auth as betterAuth } from "../libs/auth";
import { prisma } from "../libs/prisma";


const auth = (...requiredRoles: string[]) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const sessionData = await betterAuth.api.getSession({
                headers: req.headers as unknown as Headers,
            });

            if (!sessionData?.user) {
                throw new AppError(
                    httpStatus.UNAUTHORIZED,
                    "You are not authenticated. Please log in to continue.",
                );
            }

            const user = await prisma.user.findUnique({
                where: { id: sessionData.user.id },
            });

            if (!user) {
                throw new AppError(
                    httpStatus.UNAUTHORIZED,
                    "User account no longer exists.",
                );
            }

            const STATUS_ERRORS: Partial<Record<string, [number, string]>> = {
                BLOCKED: [httpStatus.FORBIDDEN, "Your account has been blocked. Please contact support."],
                SUSPENDED: [httpStatus.FORBIDDEN, "Your account is currently suspended."],
                DELETED: [httpStatus.UNAUTHORIZED, "This account has been deleted."],
            };

            const statusErr = STATUS_ERRORS[user.status];
            if (statusErr) throw new AppError(statusErr[0], statusErr[1]);

            if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
                throw new AppError(
                    httpStatus.FORBIDDEN,
                    "You do not have permission to access this resource.",
                );
            }

            req.user = user;
            req.session = sessionData.session as any;

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default auth;

import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AuthService } from "./auth.service";

/**
 * Helper to forward cookies from Better Auth Fetch Response to Express Response
 */
const forwardSetCookieHeaders = (sourceHeaders: Headers, res: Response) => {
  if (!sourceHeaders) return;

  // Handle getSetCookie if available in node environment, or parse set-cookie
  const getSetCookie = (sourceHeaders as any).getSetCookie?.();
  if (Array.isArray(getSetCookie) && getSetCookie.length > 0) {
    getSetCookie.forEach((cookie: string) => {
      res.append("Set-Cookie", cookie);
    });
  } else {
    const rawSetCookie = sourceHeaders.get("set-cookie");
    if (rawSetCookie) {
      res.setHeader("Set-Cookie", rawSetCookie);
    }
  }
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(
    req.body,
    req.headers as unknown as Headers,
  );

  forwardSetCookieHeaders(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully.",
    data: result.data,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(
    req.body,
    req.headers as unknown as Headers,
  );

  forwardSetCookieHeaders(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully.",
    data: result.data,
  });
});

const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await AuthService.getCurrentUser(userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current user profile fetched successfully.",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.logoutUser(
    req.headers as unknown as Headers,
  );

  forwardSetCookieHeaders(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully.",
    data: result.data,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(
    req.body,
    req.headers as unknown as Headers,
  );

  forwardSetCookieHeaders(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully.",
    data: result.data,
  });
});

export const AuthController = {
  register,
  login,
  getCurrentUser,
  logout,
  changePassword,
};

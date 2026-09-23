import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AuthService, extractSetCookies } from "./auth.service";

const forwardCookies = (sourceHeaders: Headers, res: Response): void => {
  extractSetCookies(sourceHeaders).forEach((cookie) => res.append("Set-Cookie", cookie));
};

// ---------------------------------------------------------------------------

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);

  // forwardCookies(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Account created successfully.",
    data: result
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(
    req.body,
    req.headers as unknown as Headers,
  );

  forwardCookies(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully.",
    data: result.data,
  });
});

const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getCurrentUser(req.user?.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully.",
    data: result,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.logoutUser(req.headers as unknown as Headers);

  forwardCookies(result.responseHeaders, res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully.",
    data: null,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(
    req.body,
    req.headers as unknown as Headers,
  );



  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully.",
    data: null,
  });
});

// ---------------------------------------------------------------------------

export const AuthController = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  changePassword,
};

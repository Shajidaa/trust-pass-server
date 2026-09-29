import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { UserService } from "./user.service";

// ---------------------------------------------------------------------------
// /users/me
// ---------------------------------------------------------------------------

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMe(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully.",
    data: result,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateMe(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully.",
    data: result,
  });
});

// ---------------------------------------------------------------------------
// /profile/me
// ---------------------------------------------------------------------------

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMyProfile(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully.",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateMyProfile(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully.",
    data: result,
  });
});

const uploadProfilePhoto = catchAsync(async (req: Request, res: Response) => {
  //   console.log("req.file", req.file);
  if (!req.file)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No file uploaded. Include a file in the 'file' field.",
    );
  const result = await UserService.uploadProfilePhoto(req.user!.id, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile photo uploaded successfully.",
    data: result,
  });
});

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, search, role, status } = req.query;
  const result = await UserService.listUsers(
    page ? Number(page) : 1,
    limit ? Number(limit) : 20,
    search ? String(search) : undefined,
    role ? String(role) : undefined,
    status ? String(status) : undefined,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserById(String(req.params.id));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully.",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserRole(
    String(req.params.id),
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role updated successfully.",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await UserService.deleteUser(String(req.params.id), req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully.",
    data: null,
  });
});

export const UserController = {
  getMe,
  updateMe,
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  listUsers,
  getUserById,
  updateUserRole,
  deleteUser,
};

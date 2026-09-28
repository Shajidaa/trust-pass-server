import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "./admin.service";

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await AdminService.getDashboardStats();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Dashboard stats fetched successfully.",
        data: result,
    });
});

const getAdminBusinesses = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, search, verificationStatus } = req.query;
    const result = await AdminService.getAdminBusinesses(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
        search ? String(search) : undefined,
        verificationStatus ? String(verificationStatus) : undefined,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Businesses fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getAdminReports = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, status } = req.query;
    const result = await AdminService.getAdminReports(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
        status ? String(status) : undefined,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reports fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getAdminUsers = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, search, role, status } = req.query;
    const result = await AdminService.getAdminUsers(
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

export const AdminController = {
    getDashboardStats,
    getAdminBusinesses,
    getAdminReports,
    getAdminUsers,
};

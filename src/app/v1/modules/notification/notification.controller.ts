import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const listNotifications = catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const result = await NotificationService.listNotifications(
        req.user!.id,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Notifications fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.getUnreadCount(req.user!.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Unread count fetched successfully.",
        data: result,
    });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.markAsRead(
        String(req.params.id),
        req.user!.id,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Notification marked as read.",
        data: result,
    });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.markAllAsRead(req.user!.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All notifications marked as read.",
        data: result,
    });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
    await NotificationService.deleteNotification(
        String(req.params.id),
        req.user!.id,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Notification deleted successfully.",
        data: null,
    });
});

export const NotificationController = {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};

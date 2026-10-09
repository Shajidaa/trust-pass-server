import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { NotificationService } from "./notification.service";

// ---------------------------------------------------------------------------
// User — own notifications
// ---------------------------------------------------------------------------

const listNotifications = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, type, isRead } = req.query;

    const result = await NotificationService.listNotifications(req.user!.id, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        type: type ? (String(type) as any) : undefined,
        isRead: isRead !== undefined ? isRead === "true" : undefined,
    });

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
    const { type } = req.query;
    const result = await NotificationService.markAllAsRead(
        req.user!.id,
        type ? String(type) : undefined,
    );
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

const deleteAllRead = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.deleteAllRead(req.user!.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All read notifications deleted.",
        data: result,
    });
});

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

const adminCreateNotification = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.adminCreateNotification(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Notification created successfully.",
        data: result,
    });
});

const broadcastNotification = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.broadcastNotification(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Notification broadcast successfully.",
        data: result,
    });
});

export const NotificationController = {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    adminCreateNotification,
    broadcastNotification,
};

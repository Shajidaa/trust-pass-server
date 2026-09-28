import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";

const SELECT = {
    id: true,
    type: true,
    title: true,
    message: true,
    isRead: true,
    createdAt: true,
} as const;

// ---------------------------------------------------------------------------
// List own notifications  (paginated, unread first)
// ---------------------------------------------------------------------------

const listNotifications = async (
    userId: string,
    page = 1,
    limit = 20,
) => {
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
            skip,
            take: limit,
            select: SELECT,
        }),
        prisma.notification.count({ where: { user_id: userId } }),
    ]);

    return {
        meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
        data: notifications,
    };
};

// ---------------------------------------------------------------------------
// Unread count
// ---------------------------------------------------------------------------

const getUnreadCount = async (userId: string) => {
    const count = await prisma.notification.count({
        where: { user_id: userId, isRead: false },
    });
    return { unreadCount: count };
};

// ---------------------------------------------------------------------------
// Mark single notification as read
// ---------------------------------------------------------------------------

const markAsRead = async (id: string, userId: string) => {
    const notification = await prisma.notification.findUnique({
        where: { id },
        select: { id: true, user_id: true },
    });

    if (!notification) throw new AppError(httpStatus.NOT_FOUND, "Notification not found.");
    if (notification.user_id !== userId)
        throw new AppError(httpStatus.FORBIDDEN, "You do not own this notification.");

    return prisma.notification.update({
        where: { id },
        data: { isRead: true },
        select: SELECT,
    });
};

// ---------------------------------------------------------------------------
// Mark all as read
// ---------------------------------------------------------------------------

const markAllAsRead = async (userId: string) => {
    const { count } = await prisma.notification.updateMany({
        where: { user_id: userId, isRead: false },
        data: { isRead: true },
    });
    return { updated: count };
};

// ---------------------------------------------------------------------------
// Delete notification
// ---------------------------------------------------------------------------

const deleteNotification = async (id: string, userId: string) => {
    const notification = await prisma.notification.findUnique({
        where: { id },
        select: { id: true, user_id: true },
    });

    if (!notification) throw new AppError(httpStatus.NOT_FOUND, "Notification not found.");
    if (notification.user_id !== userId)
        throw new AppError(httpStatus.FORBIDDEN, "You do not own this notification.");

    await prisma.notification.delete({ where: { id } });
    return null;
};

// ---------------------------------------------------------------------------
// Internal helper — used by other services to create notifications
// ---------------------------------------------------------------------------

export const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
) => {
    return prisma.notification.create({
        data: { user_id: userId, type, title, message },
    });
};

// ---------------------------------------------------------------------------

export const NotificationService = {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};

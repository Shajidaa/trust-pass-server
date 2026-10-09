import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
  IBroadcastNotificationPayload,
  ICreateNotificationPayload,
  INotificationFilters,
} from "./notification.interface";

const SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,

  isRead: true,
  createdAt: true,
} as const;

// ---------------------------------------------------------------------------
// List own notifications  (paginated, filtered by type / read status)
// ---------------------------------------------------------------------------

const listNotifications = async (
  userId: string,
  filters: INotificationFilters,
) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: any = { user_id: userId };
  if (filters.type) where.type = filters.type;
  if (filters.isRead !== undefined) where.isRead = filters.isRead;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: SELECT,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { user_id: userId, isRead: false } }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
      unreadCount,
    },
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
    select: { id: true, user_id: true, isRead: true },
  });

  if (!notification)
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found.");
  if (notification.user_id !== userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not own this notification.",
    );

  if (notification.isRead)
    return prisma.notification.findUnique({ where: { id }, select: SELECT });

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: SELECT,
  });
};

// ---------------------------------------------------------------------------
// Mark all as read  (optionally filter by type)
// ---------------------------------------------------------------------------

const markAllAsRead = async (userId: string, type?: string) => {
  const where: any = { user_id: userId, isRead: false };
  if (type) where.type = type;

  const { count } = await prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });
  return { updated: count };
};

// ---------------------------------------------------------------------------
// Delete single notification
// ---------------------------------------------------------------------------

const deleteNotification = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, user_id: true },
  });

  if (!notification)
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found.");
  if (notification.user_id !== userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not own this notification.",
    );

  await prisma.notification.delete({ where: { id } });
  return null;
};

// ---------------------------------------------------------------------------
// Delete all read notifications for user  (housekeeping)
// ---------------------------------------------------------------------------

const deleteAllRead = async (userId: string) => {
  const { count } = await prisma.notification.deleteMany({
    where: { user_id: userId, isRead: true },
  });
  return { deleted: count };
};

// ---------------------------------------------------------------------------
// ADMIN — Create notification for a specific user
// ---------------------------------------------------------------------------

const adminCreateNotification = async (payload: ICreateNotificationPayload) => {
  const userExists = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true },
  });
  if (!userExists)
    throw new AppError(httpStatus.NOT_FOUND, "Target user not found.");

  return prisma.notification.create({
    data: {
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      ...(payload.metadata ? { metadata: payload.metadata as any } : {}),
    },
    select: { ...SELECT, user_id: true },
  });
};

// ---------------------------------------------------------------------------
// ADMIN — Broadcast notification (all users OR list of userIds)
// ---------------------------------------------------------------------------

const broadcastNotification = async (
  payload: IBroadcastNotificationPayload,
) => {
  let targetIds: string[];

  if (payload.userIds && payload.userIds.length > 0) {
    // Validate that all supplied IDs exist
    const found = await prisma.user.findMany({
      where: { id: { in: payload.userIds } },
      select: { id: true },
    });
    targetIds = found.map((u) => u.id);

    const missing = payload.userIds.length - targetIds.length;
    if (missing > 0) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        `${missing} user ID(s) were not found and were skipped. Provide valid IDs only.`,
      );
    }
  } else {
    // Broadcast to ALL active users
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    targetIds = users.map((u) => u.id);
  }

  if (targetIds.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "No valid recipients found.");
  }

  const data = targetIds.map((user_id) => ({
    user_id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    ...(payload.metadata ? { metadata: payload.metadata as any } : {}),
  }));

  const result = await prisma.notification.createMany({ data });
  return { sent: result.count, recipientCount: targetIds.length };
};

// ---------------------------------------------------------------------------
// Internal helper — used by other services to push a notification
// ---------------------------------------------------------------------------

export const pushNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) => {
  return prisma.notification.create({
    data: {
      user_id: userId,
      type: type as any,
      title,
      message,
      ...(metadata ? { metadata: metadata as any } : {}),
    },
  });
};

// ---------------------------------------------------------------------------

export const NotificationService = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  adminCreateNotification,
  broadcastNotification,
};

import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = Router();

// ---------------------------------------------------------------------------
// User — own notifications
// GET  /api/v1/notifications              — list (paginated, filterable)
// GET  /api/v1/notifications/unread-count — unread count
// PATCH /api/v1/notifications/read-all   — mark all as read
// PATCH /api/v1/notifications/:id/read   — mark one as read
// DELETE /api/v1/notifications/read      — delete all read (housekeeping)
// DELETE /api/v1/notifications/:id       — delete one
// ---------------------------------------------------------------------------

router.get("/", auth(), NotificationController.listNotifications);
router.get("/unread-count", auth(), NotificationController.getUnreadCount);
router.patch("/read-all", auth(), NotificationController.markAllAsRead);
router.patch("/:id/read", auth(), NotificationController.markAsRead);
router.delete("/read", auth(), NotificationController.deleteAllRead);
router.delete("/:id", auth(), NotificationController.deleteNotification);

// ---------------------------------------------------------------------------

// POST /api/v1/notifications/admin/send        — single targeted notification
// POST /api/v1/notifications/admin/broadcast   — broadcast (all or subset)
// ---------------------------------------------------------------------------

router.post(
  "/admin/send",
  auth("ADMIN", "MODERATOR"),
  validateRequest(NotificationValidation.createNotificationSchema),
  NotificationController.adminCreateNotification,
);

router.post(
  "/admin/broadcast",
  auth("ADMIN", "MODERATOR"),
  validateRequest(NotificationValidation.broadcastNotificationSchema),
  NotificationController.broadcastNotification,
);

export const NotificationRoutes = router;

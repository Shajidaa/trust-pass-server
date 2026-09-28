import { Router } from "express";
import auth from "../../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

// All routes require any authenticated role
router.get("/", auth(), NotificationController.listNotifications);
router.get("/unread-count", auth(), NotificationController.getUnreadCount);
router.patch("/read-all", auth(), NotificationController.markAllAsRead);
router.patch("/:id/read", auth(), NotificationController.markAsRead);
router.delete("/:id", auth(), NotificationController.deleteNotification);

export const NotificationRoutes = router;

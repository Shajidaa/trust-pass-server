import { z } from "zod";

const NOTIFICATION_TYPES = [
    "SYSTEM",
    "ACCOUNT",
    "BUSINESS",
    "VERIFICATION",
    "REPORT",
    "TRUST_SCORE",
    "PRODUCT",
    "PROMOTION",
] as const;

const createNotificationSchema = z.object({
    userId: z.string({ message: "User ID is required" }).min(1, "Invalid user ID"),
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().min(1).max(255).trim(),
    message: z.string().min(1).max(2000).trim(),
});

const broadcastNotificationSchema = z.object({
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().min(1).max(255).trim(),
    message: z.string().min(1).max(2000).trim(),

    userIds: z
        .array(z.string().min(1, "User ID cannot be empty"))
        .min(1)
        .max(1000)
        .optional(),
});

export const NotificationValidation = {
    createNotificationSchema,
    broadcastNotificationSchema,
};

export type NotificationType =
    | "SYSTEM"
    | "ACCOUNT"
    | "BUSINESS"
    | "VERIFICATION"
    | "REPORT"
    | "TRUST_SCORE"
    | "PRODUCT"
    | "PROMOTION";

export interface ICreateNotificationPayload {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface IBroadcastNotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    /** Target specific user IDs; if omitted, sends to ALL users */
    userIds?: string[];
}

export interface INotificationFilters {
    page?: number;
    limit?: number;
    type?: NotificationType;
    isRead?: boolean;
}

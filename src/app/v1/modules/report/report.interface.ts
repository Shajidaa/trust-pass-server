export type TReportReason = "SPAM" | "INAPPROPRIATE_CONTENT" | "HARASSMENT" | "FRAUD" | "OTHER";
export type TReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "REJECTED";

export interface ICreateReportPayload {
    businessId: string;
    reason: TReportReason;
    title?: string;
    description: string;
    evidenceUrls?: string[];
}

export interface IUpdateReportStatusPayload {
    status: "REVIEWED" | "RESOLVED" | "REJECTED";
    adminNote?: string;
    actionTaken?: string;
    penaltyPoints?: number;
}

export type TBusinessVerificationStatus =
    | "PENDING"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "SUSPENDED";

export type TReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "REJECTED";

export interface IReviewBusinessVerificationPayload {
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    adminNote?: string;
}

export interface IReviewReportPayload {
    status: "REVIEWED" | "RESOLVED" | "REJECTED";
    adminNote?: string;
    actionTaken?: string;
    penaltyPoints?: number;
}

export interface IAddTrustScorePayload {
    ruleId: string;
    pointsAwarded: number;
    note?: string;
}

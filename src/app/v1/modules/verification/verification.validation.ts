import { z } from "zod";

const reviewBusinessVerificationSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
    adminNote: z.string().max(2000).trim().optional(),
});

const reviewReportSchema = z.object({
    status: z.enum(["REVIEWED", "RESOLVED", "REJECTED"]),
    adminNote: z.string().max(2000).trim().optional(),
    actionTaken: z.string().max(255).trim().optional(),
    penaltyPoints: z.number().int().min(0).optional(),
});

const addTrustScoreSchema = z.object({
    ruleId: z.string().uuid("ruleId must be a valid UUID"),
    pointsAwarded: z.number().int(),
    note: z.string().max(500).trim().optional(),
});

export const VerificationValidation = {
    reviewBusinessVerificationSchema,
    reviewReportSchema,
    addTrustScoreSchema,
};

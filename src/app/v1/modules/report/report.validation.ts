import { z } from "zod";

const REASONS = ["SPAM", "INAPPROPRIATE_CONTENT", "HARASSMENT", "FRAUD", "OTHER"] as const;

const createReportSchema = z.object({
    businessId: z.string().uuid(),
    reason: z.enum(REASONS),
    title: z.string().min(3).max(255).trim().optional(),
    description: z.string().min(10).max(5000).trim(),
    evidenceUrls: z.array(z.string().url()).max(10).optional().default([]),
});

const updateReportStatusSchema = z.object({
    status: z.enum(["REVIEWED", "RESOLVED", "REJECTED"]),
    adminNote: z.string().max(2000).trim().optional(),
    actionTaken: z.string().max(255).trim().optional(),
    penaltyPoints: z.number().int().min(0).optional(),
});

export const ReportValidation = {
    createReportSchema,
    updateReportStatusSchema,
};

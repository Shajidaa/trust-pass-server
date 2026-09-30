import { z } from "zod";

const REASONS = ["SPAM", "INAPPROPRIATE_CONTENT", "HARASSMENT", "FRAUD", "OTHER"] as const;



export const createReportSchema = z.object({
    businessId: z.string({
        // required_error: "Business ID is required",
    }).uuid("Invalid business ID format"),

    reason: z.enum(REASONS), // REASONS array thakle eta thik ache

    title: z.string().min(3).max(255).trim().optional(),

    description: z.string({
        // required_error: "Description is required",
    }).min(10, "Description must be at least 10 characters").max(5000).trim(),
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

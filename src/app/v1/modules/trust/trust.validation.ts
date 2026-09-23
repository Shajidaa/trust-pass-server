import { z } from "zod";

const RULE_STATUS = ["VERIFICATION", "ACTIVITY", "REPORT"] as const;

const createTrustRuleSchema = z.object({
    ruleKey: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-z0-9_]+$/, "ruleKey must be lowercase letters, numbers, or underscores"),
    label: z.string().min(2).max(255).trim(),
    points: z.number(),
    isActive: z.boolean().optional().default(true),
    status: z.enum(RULE_STATUS),
});

const updateTrustRuleSchema = z.object({
    label: z.string().min(2).max(255).trim().optional(),
    points: z.number().optional(),
    isActive: z.boolean().optional(),
    status: z.enum(RULE_STATUS).optional(),
});

export const TrustValidation = {
    createTrustRuleSchema,
    updateTrustRuleSchema,
};

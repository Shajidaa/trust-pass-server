import { z } from "zod";

const createCategorySchema = z.object({
    name: z.string().min(2).max(100).trim(),
    iconUrl: z.string().url("Icon must be a valid URL").optional(),
    isActive: z.boolean().optional().default(true),
});

const updateCategorySchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    iconUrl: z.string().url("Icon must be a valid URL").optional(),
    isActive: z.boolean().optional(),
});

export const CategoryValidation = {
    createCategorySchema,
    updateCategorySchema,
};

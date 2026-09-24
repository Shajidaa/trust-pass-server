import { z } from "zod";

const CURRENCIES = ["BDT", "USD", "INR", "GBP", "EUR"] as const;
const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "DELETED"] as const;

const createProductSchema = z.object({
    businessId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(255).trim(),
    description: z.string().max(10000).trim().optional(),
    price: z.number().min(0, "Price must be a positive number"),
    currency: z.enum(CURRENCIES).optional().default("BDT"),
    stock: z.number().int().min(0).optional(),
    images: z.array(z.string().url()).max(10).optional().default([]),
    status: z.enum(STATUSES).optional().default("DRAFT"),
});

const updateProductSchema = z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(255).trim().optional(),
    description: z.string().max(10000).trim().optional(),
    price: z.number().min(0).optional(),
    currency: z.enum(CURRENCIES).optional(),
    stock: z.number().int().min(0).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    status: z.enum(STATUSES).optional(),
});

export const ProductValidation = {
    createProductSchema,
    updateProductSchema,
};

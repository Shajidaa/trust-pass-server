import { z } from "zod";

const CURRENCIES = ["BDT", "USD", "INR", "GBP", "EUR"] as const;
const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "DELETED"] as const;

/**
 * Coerce helper — multipart/form-data sends numbers as strings.
 */
const coerceNumber = z.preprocess((v) => (v !== undefined && v !== "" ? Number(v) : undefined), z.number());
const coerceOptionalNumber = z.preprocess(
    (v) => (v !== undefined && v !== "" ? Number(v) : undefined),
    z.number().optional(),
);

const createProductSchema = z.object({
    businessId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(255).trim(),
    description: z.string().max(10000).trim().optional(),
    price: coerceNumber.pipe(z.number().min(0, "Price must be a positive number")),
    currency: z.enum(CURRENCIES).optional().default("BDT"),
    stock: coerceOptionalNumber.pipe(z.number().int().min(0).optional()),

    status: z.enum(STATUSES).optional().default("DRAFT"),
});

const updateProductSchema = z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(255).trim().optional(),
    description: z.string().max(10000).trim().optional(),
    price: coerceOptionalNumber.pipe(z.number().min(0).optional()),
    currency: z.enum(CURRENCIES).optional(),
    stock: coerceOptionalNumber.pipe(z.number().int().min(0).optional()),
    /**
     * Comma-separated OR JSON array of publicIds to keep.
     * e.g. "products/abc123,products/xyz456"  OR  ["products/abc123"]
     * Anything NOT in this list will be removed from Cloudinary.
     */
    retainImagePublicIds: z
        .preprocess((v) => {
            if (!v) return undefined;
            if (Array.isArray(v)) return v;
            if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
            return undefined;
        }, z.array(z.string()).optional()),
    status: z.enum(STATUSES).optional(),
});

export const ProductValidation = {
    createProductSchema,
    updateProductSchema,
};

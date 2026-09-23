import { z } from "zod";

const DIVISIONS = ["DHAKA", "CHITTAGONG", "RAJSHAHI", "KHULNA", "BARISAL", "SYLHET", "RANGPUR", "MYMENSINGH"] as const;
const COUNTRIES = ["BANGLADESH", "INDIA", "USA", "UK", "OTHER"] as const;
const BUSINESS_TYPES = ["INDIVIDUAL", "COMPANY", "NGO", "GOVERNMENT", "OTHER"] as const;

const addressSchema = z.object({
    addressLine: z.string().min(3).max(500).trim(),
    city: z.string().min(2).max(100).trim(),
    district: z.string().min(2).max(100).trim(),
    division: z.enum(DIVISIONS),
    postalCode: z.string().min(3).max(20).trim(),
    country: z.enum(COUNTRIES).optional().default("BANGLADESH"),
});

const createBusinessSchema = z.object({
    name: z.string().min(2).max(255).trim(),
    description: z.string().max(5000).trim().optional(),
    logoUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    categoryId: z.string().uuid().optional(),
    businessType: z.enum(BUSINESS_TYPES).optional().default("INDIVIDUAL"),
    websiteUrl: z.string().url().optional(),
    instaUrl: z.string().url().optional(),
    tiktokUrl: z.string().url().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().regex(/^[+0-9\s\-()]{7,30}$/).optional(),
    address: addressSchema.optional(),
});

const updateBusinessSchema = z.object({
    name: z.string().min(2).max(255).trim().optional(),
    description: z.string().max(5000).trim().optional(),
    logoUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    categoryId: z.string().uuid().optional(),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    websiteUrl: z.string().url().optional(),
    instaUrl: z.string().url().optional(),
    tiktokUrl: z.string().url().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().regex(/^[+0-9\s\-()]{7,30}$/).optional(),
});

const updateAddressSchema = addressSchema;

export const BusinessValidation = {
    createBusinessSchema,
    updateBusinessSchema,
    updateAddressSchema,
};

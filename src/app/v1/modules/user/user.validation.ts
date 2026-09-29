import { z } from "zod";

const updateUserSchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    phone: z.string().regex(/^[+0-9\s\-()]{7,30}$/).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

const updateProfileSchema = z.object({
    links: z.array(z.string().url("Each link must be a valid URL")).max(10).optional(),
});

const updateRoleSchema = z.object({
    role: z.enum(["CUSTOMER", "BUYER", "MODERATOR", "ADMIN"]),
});

export const UserValidation = {
    updateUserSchema,
    updateProfileSchema,
    updateRoleSchema,
};

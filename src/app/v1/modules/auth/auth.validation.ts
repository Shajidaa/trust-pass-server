import { z } from "zod";

const registerValidationSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
  phone: z
    .string()
    .regex(/^[+0-9\s\-()]{7,20}$/, "Please provide a valid phone number")
    .optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const).optional(),
  role: z.enum(["CUSTOMER", "BUYER", "MODERATOR", "ADMIN"] as const).optional(),
  image: z.string().url("Image must be a valid URL").optional(),
});

const loginValidationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

const verifyEmailValidationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const resendVerificationValidationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const changePasswordValidationSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  revokeOtherSessions: z.boolean().optional().default(true),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  verifyEmailValidationSchema,
  resendVerificationValidationSchema,
  changePasswordValidationSchema,
};

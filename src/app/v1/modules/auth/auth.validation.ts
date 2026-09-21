import { z } from "zod";

const registerValidationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password cannot exceed 128 characters"),
  phone: z
    .string()
    .regex(/^[+0-9\s\-()]{7,20}$/, "Please provide a valid phone number")
    .optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const).optional(),
  role: z.enum(["CUSTOMER", "BUYER", "MODERATOR", "ADMIN"] as const).optional(),
  image: z.string().url("Image must be a valid URL").optional(),
});

const loginValidationSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Password is required"),
});

const changePasswordValidationSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
  revokeOtherSessions: z.boolean().optional().default(true),
});

const verifyEmailOtpValidationSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

const resendOtpValidationSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  changePasswordValidationSchema,
  verifyEmailOtpValidationSchema,
  resendOtpValidationSchema,
};


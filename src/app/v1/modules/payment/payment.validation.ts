import { z } from "zod";

const initiatePaymentSchema = z.object({
  businessId: z.string().uuid("Invalid businessId format"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .optional()
    .default(1),
});

const executePaymentSchema = z.object({
  paymentID: z.string().min(1, "bKash paymentID is required"),
});

export const PaymentValidation = {
  initiatePaymentSchema,
  executePaymentSchema,
};

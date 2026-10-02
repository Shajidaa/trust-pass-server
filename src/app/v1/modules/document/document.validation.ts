import { z } from "zod";

const DOCUMENT_TYPES = [
  "TRADE_LICENSE",
  "NID",
  "TIN_CERTIFICATE",
  "VAT_CERTIFICATE",
  "BANK_STATEMENT",
  "UTILITY_BILL",
  "OTHER",
] as const;

const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO datetime" })
    .optional(),
});
// const reviewDocumentSchema = z.object({
//   body: z.object({
//     status: z.enum(["APPROVED", "REJECTED"], {
//       required_error: "Status is required (APPROVED or REJECTED).",
//     }),
//     rejectionReason: z.string().optional(),
//   }),
// });
export const DocumentValidation = {
  uploadDocumentSchema,
  // reviewDocumentSchema,
};

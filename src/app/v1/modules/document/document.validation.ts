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
    expiresAt: z.string().datetime({ message: "expiresAt must be a valid ISO datetime" }).optional(),
});

export const DocumentValidation = {
    uploadDocumentSchema,
};

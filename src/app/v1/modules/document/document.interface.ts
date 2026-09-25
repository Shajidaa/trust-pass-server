export type TDocumentType =
    | "TRADE_LICENSE"
    | "NID"
    | "TIN_CERTIFICATE"
    | "VAT_CERTIFICATE"
    | "BANK_STATEMENT"
    | "UTILITY_BILL"
    | "OTHER";

export type TDocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IUploadDocumentPayload {
    documentType: TDocumentType;
    expiresAt?: string; // ISO date string
}

import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../libs/cloudinary";
import { prisma } from "../../../libs/prisma";
import { IUploadDocumentPayload } from "./document.interface";
import { sha256 } from "../../../helpers/hash";
const DOC_RULE_KEY_MAP: Record<string, string> = {
  TRADE_LICENSE: "trade_license_01",
  NID: "nid",
  TIN_CERTIFICATE: "tin_certificate",
  VAT_CERTIFICATE: "vat_certificate",
  BANK_STATEMENT: "bank_statement",
};
/**
 * Assert the business exists and the requester owns it.
 * Admins and moderators can bypass ownership (pass skipOwnership = true).
 */
const assertAccess = async (
  businessId: string,
  userId: string,
  role: string,
) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true },
  });

  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  const isPrivileged = role === "ADMIN" || role === "MODERATOR";
  if (!isPrivileged && business.ownerId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have access to this business.",
    );
  }

  return business;
};

// ---------------------------------------------------------------------------
// Upload document  (SELLER — own business only)
// ---------------------------------------------------------------------------

const uploadDocument = async (
  businessId: string,
  ownerId: string,
  file: Express.Multer.File,
  payload: IUploadDocumentPayload,
) => {
  // Ownership — only the SELLER who owns the business can upload
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true },
  });
  const ALLOWED_DOC_TYPES = [
    "TRADE_LICENSE",
    "NID",
    "TIN_CERTIFICATE",
    "VAT_CERTIFICATE",
    "BANK_STATEMENT",
  ] as const;

  // uploadDocument
  if (!ALLOWED_DOC_TYPES.includes(payload.documentType as any)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid documentType. Allowed: ${ALLOWED_DOC_TYPES.join(", ")}`,
    );
  }

  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  if (business.ownerId !== ownerId) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this business.");
  }

  // Compute file hash to prevent exact duplicate uploads for the same doc type
  const fileHash = sha256(file.buffer);

  const duplicate = await prisma.businessDocument.findFirst({
    where: { businessId, documentType: payload.documentType, fileHash },
  });

  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This exact document has already been uploaded for this business.",
    );
  }

  // Upload to Cloudinary under a per-business folder
  const { url } = await uploadToCloudinary(
    file.buffer,
    `trust-pass/businesses/${businessId}/documents`,
  );

  const document = await prisma.businessDocument.create({
    data: {
      businessId,
      documentType: payload.documentType,
      fileUrl: url,
      fileHash,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    },
  });

  return document;
};

// ---------------------------------------------------------------------------
// List documents for a business  (SELLER-owner | MODERATOR | ADMIN)
// ---------------------------------------------------------------------------

const listBusinessDocuments = async (
  businessId: string,
  userId: string,
  role: string,
) => {
  await assertAccess(businessId, userId, role);

  const documents = await prisma.businessDocument.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return documents;
};

// ---------------------------------------------------------------------------
// Get single document  (SELLER-owner | MODERATOR | ADMIN)
// ---------------------------------------------------------------------------

const getDocumentById = async (id: string, userId: string, role: string) => {
  const document = await prisma.businessDocument.findUnique({ where: { id } });

  if (!document)
    throw new AppError(httpStatus.NOT_FOUND, "Document not found.");

  // Re-use access check on the document's business
  await assertAccess(document.businessId, userId, role);

  return document;
};

// ---------------------------------------------------------------------------
// Delete document  (SELLER-owner | ADMIN)
// ---------------------------------------------------------------------------

const deleteDocument = async (id: string, userId: string, role: string) => {
  const document = await prisma.businessDocument.findUnique({ where: { id } });

  if (!document)
    throw new AppError(httpStatus.NOT_FOUND, "Document not found.");

  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    const business = await prisma.business.findUnique({
      where: { id: document.businessId },
      select: { ownerId: true },
    });

    if (business?.ownerId !== userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to delete this document.",
      );
    }
  }

  // Approved documents are locked — only ADMIN can delete them
  if (document.status === "APPROVED" && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Approved documents cannot be deleted. Contact an administrator.",
    );
  }

  // Extract Cloudinary public_id from the URL and delete the file
  try {
    const urlParts = document.fileUrl.split("/");
    const uploadIdx = urlParts.indexOf("upload");
    // Grab everything after /upload/v<version>/ as the public_id (strip extension)
    const publicId = urlParts
      .slice(uploadIdx + 2)
      .join("/")
      .replace(/\.[^/.]+$/, "");
    await deleteFromCloudinary(publicId);
  } catch {
    // Non-fatal — log and proceed; the DB record will still be removed
    console.warn(`[Documents] Failed to delete Cloudinary asset for doc ${id}`);
  }

  await prisma.businessDocument.delete({ where: { id } });
  return null;
};

// const reviewDocument = async (
//   documentId: string,
//   reviewerId: string,
//   payload: any,
// ) => {
//   const document = await prisma.businessDocument.findUnique({
//     where: { id: documentId },
//   });

//   if (!document) {
//     throw new AppError(httpStatus.NOT_FOUND, "Document not found.");
//   }

//   if (document.status === "APPROVED" || document.status === "REJECTED") {
//     throw new AppError(
//       httpStatus.CONFLICT,
//       "This document has already been reviewed.",
//     );
//   }

//   if (payload.status === "REJECTED" && !payload.rejectionReason) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       "A rejection reason is required when rejecting a document.",
//     );
//   }

//   const updatedDocument = await prisma.businessDocument.update({
//     where: { id: documentId },
//     data: {
//       status: payload.status,
//       reviewedAt: new Date(),

//       rejectionReason:
//         payload.status === "REJECTED" ? payload.rejectionReason : null,
//     },
//   });

//   return updatedDocument;
// };

// ---------------------------------------------------------------------------
const reviewDocument = async (
  documentId: string,
  reviewerId: string,
  payload: any,
) => {
  const document = await prisma.businessDocument.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, "Document not found.");
  }

  if (document.status === "APPROVED" || document.status === "REJECTED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This document has already been reviewed.",
    );
  }

  if (payload.status === "REJECTED" && !payload.rejectionReason) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A rejection reason is required when rejecting a document.",
    );
  }

  let scoreEntry: any = null;

  if (payload.status === "APPROVED") {
    const ruleKey = DOC_RULE_KEY_MAP[document.documentType];
    if (!ruleKey) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `No trust-score rule mapping for documentType "${document.documentType}".`,
      );
    }

    const rule = await prisma.trustScoreRule.findUnique({
      where: { ruleKey },
      select: { id: true, isActive: true, points: true, ruleKey: true },
    });

    if (!rule || !rule.isActive) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        `Trust rule "${ruleKey}" is missing or inactive. Contact admin.`,
      );
    }

    const alreadyScored = await prisma.businessTrustScore.findFirst({
      where: {
        businessId: document.businessId,
        ruleId: rule.id,
      },
    });

    if (alreadyScored) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Trust score for "${document.documentType}" already awarded.`,
      );
    }

    scoreEntry = {
      ruleId: rule.id,
      ruleKey: rule.ruleKey,
      pointsAwarded: Number(rule.points),
      note: `Auto-awarded for approved ${document.documentType}`,
    };
  }

  // ── One atomic transaction: doc review + ledger entry + snapshot + business score ──
  const [updatedDoc] = await prisma.$transaction(async (tx) => {
    const docUpdate = tx.businessDocument.update({
      where: { id: documentId },
      data: {
        status: payload.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason:
          payload.status === "REJECTED" ? payload.rejectionReason : null,
      },
    });

    if (!scoreEntry) return Promise.all([docUpdate]);

    const ledgerCreate = tx.businessTrustScore.create({
      data: {
        businessId: document.businessId,
        ruleId: scoreEntry.ruleId,
        pointsAwarded: scoreEntry.pointsAwarded,
        note: scoreEntry.note,
      },
    });

    const [doc] = await Promise.all([docUpdate, ledgerCreate]);

    // Recalculate from ledger within the same transaction
    const agg = await tx.businessTrustScore.aggregate({
      where: { businessId: document.businessId },
      _sum: { pointsAwarded: true },
    });
    const newScore = Math.min(100, Math.max(0, agg._sum.pointsAwarded ?? 0));

    await tx.business.update({
      where: { id: document.businessId },
      data: { trustScore: newScore, trustScoreUpdatedAt: new Date() },
    });

    await tx.trustScore.upsert({
      where: { businessId: document.businessId },
      create: {
        businessId: document.businessId,
        score: newScore,
        breakdown: { [scoreEntry.ruleKey]: scoreEntry.pointsAwarded },
      },
      update: {
        score: newScore,
        calculatedAt: new Date(),
      },
    });

    return [doc];
  });

  return updatedDoc;
};
export const DocumentService = {
  uploadDocument,
  listBusinessDocuments,
  getDocumentById,
  deleteDocument,
  reviewDocument,
};

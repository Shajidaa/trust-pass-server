import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../libs/cloudinary";
import { prisma } from "../../../libs/prisma";
import { IUploadDocumentPayload } from "./document.interface";
import { sha256 } from "../../../helpers/hash";

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
// Upload document  (BUYER — own business only)
// ---------------------------------------------------------------------------

const uploadDocument = async (
  businessId: string,
  ownerId: string,
  file: Express.Multer.File,
  payload: IUploadDocumentPayload,
) => {
  // Ownership — only the BUYER who owns the business can upload
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true },
  });

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
// List documents for a business  (BUYER-owner | MODERATOR | ADMIN)
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
// Get single document  (BUYER-owner | MODERATOR | ADMIN)
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
// Delete document  (BUYER-owner | ADMIN)
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

// ---------------------------------------------------------------------------

export const DocumentService = {
  uploadDocument,
  listBusinessDocuments,
  getDocumentById,
  deleteDocument,
};

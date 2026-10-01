import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
  ICreateReportPayload,
  IUpdateReportStatusPayload,
} from "./report.interface";
import { uploadToCloudinary } from "../../../libs/cloudinary";

// ---------------------------------------------------------------------------
// Safe projection for reporter-facing responses (no admin internals)
// ---------------------------------------------------------------------------

const REPORTER_SELECT = {
  id: true,
  reporterId: true,
  businessId: true,
  reason: true,
  title: true,
  description: true,
  evidenceUrls: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  business: { select: { id: true, name: true, slug: true } },
} as const;

const ADMIN_SELECT = {
  ...REPORTER_SELECT,
  reporterId: true,
  reviewedBy: true,
  reviewedAt: true,
  adminNote: true,
  actionTaken: true,
  penaltyPoints: true,
  reporter: { select: { id: true, name: true, email: true } },
} as const;

// ---------------------------------------------------------------------------
// Submit report  (CUSTOMER, SELLER)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// List own reports  (CUSTOMER, SELLER)
// ---------------------------------------------------------------------------

const createReport = async (
  reporterId: string,
  payload: ICreateReportPayload,
  file?: Express.Multer.File,
) => {
  const business = await prisma.business.findUnique({
    where: { id: payload.businessId },
    select: { id: true, ownerId: true },
  });

  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  if (business.ownerId === reporterId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot report your own business.",
    );
  }

  const openReport = await prisma.report.findFirst({
    where: {
      businessId: payload.businessId,
      reporterId,
      status: { in: ["PENDING", "REVIEWED"] },
    },
    select: { id: true },
  });

  if (openReport) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You already have an open report for this business. Wait for it to be resolved before submitting another.",
    );
  }

  // Process file upload if a file was provided in the request
  let evidenceUrls = payload.evidenceUrls ?? [];
  if (file) {
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      "reports/evidence",
    );
    evidenceUrls.push(uploadResult.url);
  }

  return prisma.report.create({
    data: {
      businessId: payload.businessId,
      reporterId,
      reason: payload.reason,
      title: payload.title,
      description: payload.description,
      evidenceUrls,
    },
    select: REPORTER_SELECT,
  });
};
const getMyReports = async (reporterId: string) => {
  return prisma.report.findMany({
    where: { reporterId },
    orderBy: { createdAt: "desc" },
    select: REPORTER_SELECT,
  });
};

// ---------------------------------------------------------------------------
// List all reports  (MODERATOR, ADMIN)
// ---------------------------------------------------------------------------

const listAllReports = async (status?: string) => {
  const where: any = {};
  if (status) where.status = status;

  return prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: ADMIN_SELECT,
  });
};

// ---------------------------------------------------------------------------
// Get report by ID
// ---------------------------------------------------------------------------

/**
 * CUSTOMER/SELLER can only see their own reports.
 * MODERATOR/ADMIN can see any report with full admin fields.
 */
const getReportById = async (id: string, requesterId: string, role: string) => {
  const isPrivileged = role === "MODERATOR" || role === "ADMIN";

  const report = await prisma.report.findUnique({
    where: { id },
    select: isPrivileged ? ADMIN_SELECT : REPORTER_SELECT,
  });

  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found.");

  // Non-privileged users can only access their own reports
  if (!isPrivileged && (report as any).reporterId !== requesterId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have access to this report.",
    );
  }

  return report;
};

// ---------------------------------------------------------------------------
// Update report status  (MODERATOR, ADMIN)
// ---------------------------------------------------------------------------

/**
 * RESOLVED + penaltyPoints → deducts from business.trustScore and clamps to 0.
 * Uses a transaction to keep report + business score in sync.
 */
const updateReportStatus = async (
  id: string,
  reviewerId: string,
  payload: IUpdateReportStatusPayload,
) => {
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, businessId: true, status: true },
  });

  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found.");

  if (report.status === "RESOLVED" || report.status === "REJECTED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This report has already been closed.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id },
      data: {
        status: payload.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        adminNote: payload.adminNote,
        actionTaken: payload.actionTaken,
        penaltyPoints: payload.penaltyPoints,
      },
      select: ADMIN_SELECT,
    });

    if (
      payload.status === "RESOLVED" &&
      payload.penaltyPoints &&
      payload.penaltyPoints > 0
    ) {
      const business = await tx.business.findUnique({
        where: { id: report.businessId },
        select: { trustScore: true },
      });
      if (business) {
        const newScore = Math.max(
          0,
          business.trustScore - payload.penaltyPoints,
        );
        await tx.business.update({
          where: { id: report.businessId },
          data: { trustScore: newScore, trustScoreUpdatedAt: new Date() },
        });
      }
    }

    return updatedReport;
  });

  return updated;
};

// ---------------------------------------------------------------------------

export const ReportService = {
  createReport,
  getMyReports,
  listAllReports,
  getReportById,
  updateReportStatus,
};

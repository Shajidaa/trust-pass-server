import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
  IAddTrustScorePayload,
  IReviewBusinessVerificationPayload,
  IReviewReportPayload,
} from "./verification.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const assertBusinessOwner = async (businessId: string, userId: string) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, verificationStatus: true },
  });
  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  if (business.ownerId !== userId)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this business.");
  return business;
};

// ---------------------------------------------------------------------------
// SELLER — Submit business for verification
// ---------------------------------------------------------------------------

/**
 * Business must have at least one APPROVED document.
 * Cannot re-submit while a PENDING / UNDER_REVIEW request already exists.
 * Sets business.verificationStatus → PENDING.
 */
const submitVerification = async (businessId: string, userId: string) => {
  const business = await assertBusinessOwner(businessId, userId);

  if (business.verificationStatus === "VERIFIED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This business is already verified.",
    );
  }

  const approvedDoc = await prisma.businessDocument.findFirst({
    where: { businessId, status: "APPROVED" },
    select: { id: true },
  });
  if (!approvedDoc) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "At least one approved document is required before submitting for verification.",
    );
  }

  const activeRequest = await prisma.businessVerification.findFirst({
    where: { businessId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
    select: { id: true },
  });
  if (activeRequest) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A verification request is already pending for this business.",
    );
  }

  const [verification] = await prisma.$transaction([
    prisma.businessVerification.create({
      data: { businessId, submittedBy: userId, status: "PENDING" },
    }),
    prisma.business.update({
      where: { id: businessId },
      data: { verificationStatus: "PENDING" },
    }),
  ]);

  return verification;
};

// ---------------------------------------------------------------------------
// MODERATOR, ADMIN — List business verifications
// ---------------------------------------------------------------------------

const listBusinessVerifications = async (status?: string) => {
  const where: any = {};
  if (status) where.status = status;

  return prisma.businessVerification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          verificationStatus: true,
          ownerId: true,
          documents: {
            where: { status: "APPROVED" },
            select: {
              id: true,
              documentType: true,
              fileUrl: true,
              status: true,
            },
          },
        },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// MODERATOR, ADMIN — Get single verification with full context
// ---------------------------------------------------------------------------

const getVerificationById = async (id: string) => {
  const record = await prisma.businessVerification.findUnique({
    where: { id },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          verificationStatus: true,
          ownerId: true,
          documents: {
            orderBy: { createdAt: "desc" as const },
            select: {
              id: true,
              documentType: true,
              fileUrl: true,
              status: true,
              reviewedAt: true,
              rejectionReason: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!record)
    throw new AppError(httpStatus.NOT_FOUND, "Verification request not found.");
  return record;
};

// ---------------------------------------------------------------------------
// MODERATOR, ADMIN — Approve / Reject business verification
// ---------------------------------------------------------------------------

const reviewBusinessVerification = async (
  id: string,
  reviewerId: string,
  payload: IReviewBusinessVerificationPayload,
) => {
  const record = await prisma.businessVerification.findUnique({
    where: { id },
  });
  if (!record)
    throw new AppError(httpStatus.NOT_FOUND, "Verification request not found.");

  if (record.status === "APPROVED" || record.status === "REJECTED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This verification has already been finalised.",
    );
  }

  const bizStatusMap: Record<string, string> = {
    APPROVED: "VERIFIED",
    REJECTED: "REJECTED",
    UNDER_REVIEW: "PENDING",
  };

  const [updated] = await prisma.$transaction([
    prisma.businessVerification.update({
      where: { id },
      data: {
        status: payload.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        adminNote: payload.adminNote,
      },
    }),
    prisma.business.update({
      where: { id: record.businessId },
      data: { verificationStatus: bizStatusMap[payload.status] as any },
    }),
  ]);

  return updated;
};

// ---------------------------------------------------------------------------
// MODERATOR, ADMIN — List reports
// ---------------------------------------------------------------------------

const listReports = async (status?: string) => {
  const where: any = {};
  if (status) where.status = status;

  return prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: { id: true, name: true, slug: true, verificationStatus: true },
      },
      reporter: { select: { id: true, name: true, email: true } },
    },
  });
};

// ---------------------------------------------------------------------------
// MODERATOR, ADMIN — Approve / Reject report
// ---------------------------------------------------------------------------

const reviewReport = async (
  id: string,
  reviewerId: string,
  payload: IReviewReportPayload,
) => {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found.");

  if (report.status === "RESOLVED" || report.status === "REJECTED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This report has already been resolved.",
    );
  }

  const operations: any[] = [
    prisma.report.update({
      where: { id },
      data: {
        status: payload.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        adminNote: payload.adminNote,
        actionTaken: payload.actionTaken,
        penaltyPoints: payload.penaltyPoints,
      },
    }),
  ];

  // Deduct penalty points from trust score if RESOLVED with penalty
  if (
    payload.status === "RESOLVED" &&
    payload.penaltyPoints &&
    payload.penaltyPoints > 0
  ) {
    const business = await prisma.business.findUnique({
      where: { id: report.businessId },
      select: { trustScore: true },
    });

    if (business) {
      const newScore = Math.max(0, business.trustScore - payload.penaltyPoints);
      operations.push(
        prisma.business.update({
          where: { id: report.businessId },
          data: { trustScore: newScore, trustScoreUpdatedAt: new Date() },
        }),
      );
    }
  }

  const [updated] = await prisma.$transaction(operations);
  return updated;
};

// ---------------------------------------------------------------------------
// Business trust scores (SELLER submit / MOD+ADMIN award)
// ---------------------------------------------------------------------------

const getBusinessTrustScores = async (businessId: string) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, trustScore: true, trustScoreUpdatedAt: true },
  });
  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  const entries = await prisma.businessTrustScore.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  const ruleIds = [...new Set(entries.map((e) => e.ruleId))];
  const rules = await prisma.trustScoreRule.findMany({
    where: { id: { in: ruleIds } },
    select: { id: true, ruleKey: true, label: true, status: true },
  });
  const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r]));

  return {
    trustScore: business.trustScore,
    updatedAt: business.trustScoreUpdatedAt,
    entries: entries.map((e) => ({ ...e, rule: ruleMap[e.ruleId] ?? null })),
  };
};

const addBusinessTrustScore = async (
  businessId: string,
  payload: IAddTrustScorePayload,
) => {
  const [business, rule] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, trustScore: true },
    }),
    prisma.trustScoreRule.findUnique({
      where: { id: payload.ruleId },
      select: { id: true, isActive: true },
    }),
  ]);

  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  if (!rule) throw new AppError(httpStatus.NOT_FOUND, "Trust rule not found.");
  if (!rule.isActive)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot apply an inactive rule.",
    );

  const entry = await prisma.businessTrustScore.create({
    data: {
      businessId,
      ruleId: payload.ruleId,
      pointsAwarded: payload.pointsAwarded,
      note: payload.note,
    },
  });

  const agg = await prisma.businessTrustScore.aggregate({
    where: { businessId },
    _sum: { pointsAwarded: true },
  });

  const newScore = Math.min(100, Math.max(0, agg._sum.pointsAwarded ?? 0));

  await prisma.business.update({
    where: { id: businessId },
    data: { trustScore: newScore, trustScoreUpdatedAt: new Date() },
  });

  return { entry, newTrustScore: newScore };
};

// ---------------------------------------------------------------------------

export const VerificationService = {
  submitVerification,
  listBusinessVerifications,
  getVerificationById,
  reviewBusinessVerification,
  listReports,
  reviewReport,
  getBusinessTrustScores,
  addBusinessTrustScore,
};

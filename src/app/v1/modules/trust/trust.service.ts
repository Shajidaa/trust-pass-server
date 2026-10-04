import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
  ICreateTrustRulePayload,
  ITrustRuleFilters,
  IUpdateTrustRulePayload,
} from "./trust.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const serializeScore = (s: any) => ({ ...s, score: Number(s.score) });
const serializeRule = (r: any) => ({ ...r, points: Number(r.points) });

// ---------------------------------------------------------------------------
// Trust Score History  (public)
// ---------------------------------------------------------------------------

/**
 * Returns the full score history for a business, most recent first.
 */
const getTrustScoreHistory = async (businessId: string) => {
  const scores = await prisma.trustScore.findMany({
    where: { businessId },
    orderBy: { calculatedAt: "desc" },
  });

  return scores.map(serializeScore);
};

// ---------------------------------------------------------------------------
// Recalculate Trust Score  (MODERATOR, ADMIN)
// ---------------------------------------------------------------------------

// trust.helper.ts
export const recalculateTrustScore = async (businessId: string) => {
  const agg = await prisma.businessTrustScore.aggregate({
    where: { businessId },
    _sum: { pointsAwarded: true },
  });

  const newScore = Math.min(100, Math.max(0, agg._sum.pointsAwarded ?? 0));

  await prisma.business.update({
    where: { id: businessId },
    data: {
      trustScore: newScore,
      trustScoreUpdatedAt: new Date(),
    },
  });

  return newScore;
};
// ---------------------------------------------------------------------------
// List Trust Rules  (MODERATOR, ADMIN)
// ---------------------------------------------------------------------------

const listTrustRules = async (filters: ITrustRuleFilters) => {
  const where: any = {};

  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.status) where.status = filters.status;

  const rules = await prisma.trustScoreRule.findMany({
    where,
    orderBy: [{ status: "asc" }, { label: "asc" }],
  });

  return rules.map(serializeRule);
};

// ---------------------------------------------------------------------------
// Create Trust Rule  (ADMIN)
// ---------------------------------------------------------------------------

const createTrustRule = async (payload: ICreateTrustRulePayload) => {
  const existing = await prisma.trustScoreRule.findUnique({
    where: { ruleKey: payload.ruleKey },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A rule with key "${payload.ruleKey}" already exists.`,
    );
  }

  const rule = await prisma.trustScoreRule.create({
    data: {
      ruleKey: payload.ruleKey,
      label: payload.label.trim(),
      points: payload.points,
      isActive: payload.isActive ?? true,
      status: payload.status ?? "ACTIVE",
    },
  });

  return serializeRule(rule);
};

// ---------------------------------------------------------------------------
// Update Trust Rule  (ADMIN)
// ---------------------------------------------------------------------------

const updateTrustRule = async (
  id: string,
  payload: IUpdateTrustRulePayload,
) => {
  const existing = await prisma.trustScoreRule.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Trust rule not found.");
  }

  const rule = await prisma.trustScoreRule.update({
    where: { id },
    data: {
      ...(payload.label !== undefined ? { label: payload.label.trim() } : {}),
      ...(payload.points !== undefined ? { points: payload.points } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    },
  });

  return serializeRule(rule);
};

// ---------------------------------------------------------------------------
// Delete Trust Rule  (ADMIN)
// ---------------------------------------------------------------------------

const deleteTrustRule = async (id: string) => {
  const existing = await prisma.trustScoreRule.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Trust rule not found.");
  }

  await prisma.trustScoreRule.delete({ where: { id } });
};

// ---------------------------------------------------------------------------

export const TrustService = {
  getTrustScoreHistory,
  recalculateTrustScore,
  listTrustRules,
  createTrustRule,
  updateTrustRule,
  deleteTrustRule,
};

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

const recalculateTrustScore = async (businessId: string) => {
  const activeRules = await prisma.trustScoreRule.findMany({
    where: { isActive: true },
    orderBy: [{ status: "asc" }, { ruleKey: "asc" }],
  });

  if (activeRules.length === 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "No active trust rules found. Add rules before recalculating.",
    );
  }

  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const rule of activeRules) {
    const pts = Number(rule.points);
    breakdown[rule.ruleKey] = pts;
    total += pts;
  }

  // Clamp to [0, 100]
  const score = Math.min(100, Math.max(0, total));

  const entry = await prisma.trustScore.create({
    data: { businessId, score, breakdown },
  });

  return {
    ...serializeScore(entry),
    breakdown,
    rulesApplied: activeRules.length,
  };
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
      status: payload.status,
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

import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { TrustService } from "./trust.service";

// ---------------------------------------------------------------------------
// Trust Scores
// ---------------------------------------------------------------------------

const getTrustScoreHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await TrustService.getTrustScoreHistory(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trust score history fetched successfully.",
    data: result,
  });
});

const recalculateTrustScore = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TrustService.recalculateTrustScore(
      String(req.params.id),
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Trust score recalculated successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------------------------------------
// Trust Rules
// ---------------------------------------------------------------------------

const listTrustRules = catchAsync(async (req: Request, res: Response) => {
  const { isActive, status } = req.query;

  const result = await TrustService.listTrustRules({
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    status: status ? (String(status) as any) : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trust rules fetched successfully.",
    data: result,
  });
});

const createTrustRule = catchAsync(async (req: Request, res: Response) => {
  const result = await TrustService.createTrustRule(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Trust rule created successfully.",
    data: result,
  });
});

const updateTrustRule = catchAsync(async (req: Request, res: Response) => {
  const result = await TrustService.updateTrustRule(
    String(req.params.id),
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trust rule updated successfully.",
    data: result,
  });
});

const deleteTrustRule = catchAsync(async (req: Request, res: Response) => {
  await TrustService.deleteTrustRule(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trust rule deleted successfully.",
  });
});

// ---------------------------------------------------------------------------

export const TrustController = {
  getTrustScoreHistory,
  recalculateTrustScore,
  listTrustRules,
  createTrustRule,
  updateTrustRule,
  deleteTrustRule,
};

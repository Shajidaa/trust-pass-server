import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { VerificationService } from "./verification.service";

const submitVerification = catchAsync(async (req: Request, res: Response) => {
  const result = await VerificationService.submitVerification(
    String(req.params.id),
    req.user!.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Verification request submitted successfully.",
    data: result,
  });
});

const listBusinessVerifications = catchAsync(
  async (req: Request, res: Response) => {
    const result = await VerificationService.listBusinessVerifications(
      req.query.status ? String(req.query.status) : undefined,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Verification requests fetched successfully.",
      data: result,
    });
  },
);

const getVerificationById = catchAsync(async (req: Request, res: Response) => {
  const result = await VerificationService.getVerificationById(
    String(req.params.id),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification request fetched successfully.",
    data: result,
  });
});

const reviewBusinessVerification = catchAsync(
  async (req: Request, res: Response) => {
    const result = await VerificationService.reviewBusinessVerification(
      String(req.params.id),
      req.user!.id,
      req.body,
    );
    const statusText = req.body?.status
      ? String(req.body.status).toLowerCase()
      : "updated";
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Verification ${statusText} successfully.`,
      data: result,
    });
  },
);

// Added missing handlers for reports & trust scores
const listReports = catchAsync(async (req: Request, res: Response) => {
  const result = await VerificationService.listReports(
    req.query.status ? String(req.query.status) : undefined,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reports fetched successfully.",
    data: result,
  });
});

const reviewReport = catchAsync(async (req: Request, res: Response) => {
  const result = await VerificationService.reviewReport(
    String(req.params.id),
    req.user!.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Report reviewed successfully.",
    data: result,
  });
});

const getBusinessTrustScores = catchAsync(
  async (req: Request, res: Response) => {
    const result = await VerificationService.getBusinessTrustScores(
      String(req.params.id),
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Business trust scores fetched successfully.",
      data: result,
    });
  },
);

const addBusinessTrustScore = catchAsync(
  async (req: Request, res: Response) => {
    const result = await VerificationService.addBusinessTrustScore(
      String(req.params.id),
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Trust score added successfully.",
      data: result,
    });
  },
);

export const VerificationController = {
  submitVerification,
  listBusinessVerifications,
  getVerificationById,
  reviewBusinessVerification,
  listReports,
  reviewReport,
  getBusinessTrustScores,
  addBusinessTrustScore,
};

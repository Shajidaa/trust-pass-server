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

const listBusinessVerifications = catchAsync(async (req: Request, res: Response) => {
    const result = await VerificationService.listBusinessVerifications(
        req.query.status ? String(req.query.status) : undefined,
    );
    console.log(result);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verification requests fetched successfully.",
        data: result,
    });
});

const getVerificationById = catchAsync(async (req: Request, res: Response) => {
    const result = await VerificationService.getVerificationById(String(req.params.id));
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verification request fetched successfully.",
        data: result,
    });
});

const reviewBusinessVerification = catchAsync(async (req: Request, res: Response) => {
    const result = await VerificationService.reviewBusinessVerification(
        String(req.params.id),
        req.user!.id,
        req.body,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Verification ${String(req.body.status).toLowerCase()} successfully.`,
        data: result,
    });
});

export const VerificationController = {
    submitVerification,
    listBusinessVerifications,
    getVerificationById,
    reviewBusinessVerification,
};

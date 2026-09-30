import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { ReportService } from "./report.service";

const createReport = catchAsync(async (req: Request, res: Response) => {
    console.log("REQ BODY:", req.body);
    console.log(req.file);
    const file = req.file;
    const result = await ReportService.createReport(req.user!.id, req.body, file);


    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Report submitted successfully.",
        data: result,
    });
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.getMyReports(req.user!.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your reports fetched successfully.",
        data: result,
    });
});

const listAllReports = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.listAllReports(
        req.query.status ? String(req.query.status) : undefined,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reports fetched successfully.",
        data: result,
    });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.getReportById(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Report fetched successfully.",
        data: result,
    });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.updateReportStatus(
        String(req.params.id),
        req.user!.id,
        req.body,
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Report status updated successfully.",
        data: result,
    });
});

export const ReportController = {
    createReport,
    getMyReports,
    listAllReports,
    getReportById,
    updateReportStatus,
};

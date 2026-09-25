import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { DocumentService } from "./document.service";

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
    // console.log(req.file);

    if (!req.file) {
        throw new AppError(httpStatus.BAD_REQUEST, "No file uploaded. Include a file in the 'file' field.");
    }

    const result = await DocumentService.uploadDocument(
        String(req.params.id),
        req.user!.id,
        req.file,
        req.body,
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Document uploaded successfully.",
        data: result,
    });
});

const listBusinessDocuments = catchAsync(async (req: Request, res: Response) => {
    const result = await DocumentService.listBusinessDocuments(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Documents fetched successfully.",
        data: result,
    });
});

const getDocumentById = catchAsync(async (req: Request, res: Response) => {
    const result = await DocumentService.getDocumentById(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Document fetched successfully.",
        data: result,
    });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
    await DocumentService.deleteDocument(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Document deleted successfully.",
        data: null,
    });
});

export const DocumentController = {
    uploadDocument,
    listBusinessDocuments,
    getDocumentById,
    deleteDocument,
};

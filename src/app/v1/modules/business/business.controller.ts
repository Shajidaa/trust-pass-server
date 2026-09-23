import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { BusinessService } from "./business.service";

const listBusinesses = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, search, categoryId, businessType, verificationStatus } = req.query;

    const result = await BusinessService.listBusinesses({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        businessType: businessType ? String(businessType) as any : undefined,
        verificationStatus: verificationStatus ? String(verificationStatus) as any : undefined,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Businesses fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getBusinessById = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.getBusinessById(String(req.params.id));

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business fetched successfully.",
        data: result,
    });
});

const getBusinessBySlug = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.getBusinessBySlug(String(req.params.slug));

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business fetched successfully.",
        data: result,
    });
});

const getMyBusinesses = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.getMyBusinesses(req.user!.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your businesses fetched successfully.",
        data: result,
    });
});

const createBusiness = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.createBusiness(req.user!.id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Business created successfully.",
        data: result,
    });
});

const updateBusiness = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.updateBusiness(
        String(req.params.id),
        req.user!.id,
        req.body,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business updated successfully.",
        data: result,
    });
});

const deleteBusiness = catchAsync(async (req: Request, res: Response) => {
    await BusinessService.deleteBusiness(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business deleted successfully.",
        data: null,
    });
});

const updateBusinessAddress = catchAsync(async (req: Request, res: Response) => {
    const result = await BusinessService.updateBusinessAddress(
        String(req.params.id),
        req.user!.id,
        req.body,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business address updated successfully.",
        data: result,
    });
});

export const BusinessController = {
    listBusinesses,
    getBusinessById,
    getBusinessBySlug,
    getMyBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    updateBusinessAddress,
};

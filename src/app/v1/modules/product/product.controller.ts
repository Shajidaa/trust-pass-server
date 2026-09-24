import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { ProductService } from "./product.service";

const listProducts = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, search, categoryId, currency, status, minPrice, maxPrice } = req.query;

    const result = await ProductService.listProducts({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        currency: currency ? String(currency) as any : undefined,
        status: status ? String(status) as any : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Products fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const listBusinessProducts = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, search, categoryId, status, minPrice, maxPrice } = req.query;

    const result = await ProductService.listBusinessProducts(String(req.params.id), {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        status: status ? String(status) as any : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Business products fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getProductById(String(req.params.id));

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product fetched successfully.",
        data: result,
    });
});

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getProductBySlug(String(req.params.slug));

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product fetched successfully.",
        data: result,
    });
});

const createProduct = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.createProduct(req.user!.id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Product created successfully.",
        data: result,
    });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.updateProduct(
        String(req.params.id),
        req.user!.id,
        req.body,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product updated successfully.",
        data: result,
    });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await ProductService.deleteProduct(
        String(req.params.id),
        req.user!.id,
        req.user!.role,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product deleted successfully.",
        data: null,
    });
});

export const ProductController = {
    listProducts,
    listBusinessProducts,
    getProductById,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
};

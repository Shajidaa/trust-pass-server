import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { CategoryService } from "./category.service";

const listCategories = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, search, isActive } = req.query;

  const result = await CategoryService.listCategories({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search ? String(search) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories fetched successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await CategoryService.getCategoryById(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category fetched successfully.",
    data: result,
  });
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully.",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body;
  const result = await CategoryService.updateCategory(id as string, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully.",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  await CategoryService.deleteCategory(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully.",
  });
});

export const CategoryController = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

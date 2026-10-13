import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { PaymentService } from "./payment.service";
import AppError from "../../../errors/AppError";

const getListingQuota = catchAsync(async (req: Request, res: Response) => {
  const businessId = String(req.query.businessId ?? "");
  if (!businessId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Query parameter 'businessId' is required.");
  }

  const result = await PaymentService.getListingQuota(
    businessId,
    req.user?.id,
    req.user?.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product listing quota retrieved successfully.",
    data: result,
  });
});

const initiateBkashPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiateBkashPayment(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "bKash payment initiated successfully.",
    data: result,
  });
});

const handleBkashCallback = catchAsync(async (req: Request, res: Response) => {
  const query = { ...req.query, ...req.body };
  const result = await PaymentService.handleBkashCallback(query as any);

  // Redirect the browser back to frontend client URL
  res.redirect(result.redirectUrl);
});

const executeBkashPaymentDirect = catchAsync(async (req: Request, res: Response) => {
  const { paymentID } = req.body;
  const result = await PaymentService.executeBkashPaymentDirect(
    req.user!.id,
    req.user!.role,
    paymentID,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "bKash payment executed successfully.",
    data: result,
  });
});

const queryBkashPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.queryBkashPaymentStatus(
    String(req.params.id),
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "bKash payment status queried successfully.",
    data: result,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentById(
    String(req.params.id),
    req.user!.id,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment details fetched successfully.",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, status, businessId } = req.query;

  const result = await PaymentService.getMyPayments(req.user!.id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status ? String(status) : undefined,
    businessId: businessId ? String(businessId) : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User payments retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, status, businessId, userId } = req.query;

  const result = await PaymentService.getAllPayments({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status ? String(status) : undefined,
    businessId: businessId ? String(businessId) : undefined,
    userId: userId ? String(userId) : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All payments retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

export const PaymentController = {
  getListingQuota,
  initiateBkashPayment,
  handleBkashCallback,
  executeBkashPaymentDirect,
  queryBkashPaymentStatus,
  getPaymentById,
  getMyPayments,
  getAllPayments,
};

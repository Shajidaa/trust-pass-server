import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../../config";
import AppError from "../../../errors/AppError";
import {
  bkashCreatePayment,
  bkashExecutePayment,
  bkashGrantToken,
  bkashQueryPayment,
} from "../../../libs/bkash";
import { prisma } from "../../../libs/prisma";
import {
  IBkashCallbackQuery,
  IInitiatePaymentPayload,
  IPaymentFilter,
  IProductListingQuota,
} from "./payment.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const serializePayment = (p: any) => ({
  ...p,
  amount: Number(p.amount),
});

/**
 * Safely parse bKash execute timestamp.
 * bKash returns timestamps formatted as "YYYY-MM-DDTHH:mm:ss:SSS GMT+0600" (colon before ms, space before GMT)
 * which causes native JavaScript new Date() to return "Invalid Date".
 */
const parseBkashExecuteTime = (dateStr?: string): Date => {
  if (!dateStr || typeof dateStr !== "string") return new Date();

  const match = dateStr.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}):(\d{3})\s*GMT([+-]\d{2})(\d{2})$/,
  );
  if (match) {
    const [_, dateTime, millis, tzHour, tzMin] = match;
    const isoString = `${dateTime}.${millis}${tzHour}:${tzMin}`;
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
  }

  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;

  return new Date();
};

const assertBusinessOwnership = async (businessId: string, ownerId: string) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, name: true },
  });

  if (!business) {
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  }

  if (business.ownerId !== ownerId) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this business.");
  }

  return business;
};

// ---------------------------------------------------------------------------
// Quota & Limit Calculation
// Rule: First 5 products free. Every subsequent product requires payment.
// ---------------------------------------------------------------------------

const getListingQuota = async (
  businessId: string,
  ownerId?: string,
  userRole?: string,
): Promise<IProductListingQuota> => {
  if (ownerId && userRole !== "ADMIN") {
    await assertBusinessOwnership(businessId, ownerId);
  } else {
    const businessExists = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!businessExists) {
      throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
    }
  }

  const freeLimit = config.free_product_limit || 5;
  const listingFeePerProduct = config.product_listing_fee || 100;

  const [currentProductCount, paidSlotsResult] = await Promise.all([
    prisma.product.count({
      where: {
        businessId,
        status: { not: "DELETED" },
      },
    }),
    prisma.payment.aggregate({
      where: {
        businessId,
        status: "SUCCESS",
        purpose: "PRODUCT_SLOT",
      },
      _sum: {
        slotsUnlocked: true,
      },
    }),
  ]);

  const paidSlotsTotal = paidSlotsResult._sum.slotsUnlocked || 0;
  const totalAllowed = freeLimit + paidSlotsTotal;

  // Free slots remaining (out of the 5 free limit)
  const freeSlotsRemaining = Math.max(0, freeLimit - currentProductCount);

  // Remaining available slots overall (free + paid slots - current products)
  const remainingSlots = Math.max(0, totalAllowed - currentProductCount);

  const canAddProduct = remainingSlots > 0;
  const requiresPayment = !canAddProduct;

  return {
    freeLimit,
    currentProductCount,
    freeSlotsRemaining,
    paidSlotsAvailable: paidSlotsTotal,
    canAddProduct,
    requiresPayment,
    listingFeePerProduct,
    currency: "BDT",
  };
};

// ---------------------------------------------------------------------------
// Initiate bKash Payment for Product Listing Slots
// ---------------------------------------------------------------------------

const initiateBkashPayment = async (
  userId: string,
  payload: IInitiatePaymentPayload,
) => {
  const business = await assertBusinessOwnership(payload.businessId, userId);

  const quantity = Math.max(1, payload.quantity ?? 1);
  const unitFee = config.product_listing_fee || 100;
  const totalAmount = (quantity * unitFee).toFixed(2);

  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const merchantInvoiceNumber = `INV-${Date.now()}-${randomSuffix}`;

  // Step 1: Grant bKash token
  const idToken = await bkashGrantToken();

  // Step 2: Create bKash payment intent
  const callbackURL = config.bkash_callback_url;
  const bkashRes = await bkashCreatePayment(
    idToken,
    totalAmount,
    merchantInvoiceNumber,
    callbackURL,
  );

  if (bkashRes.statusCode !== "0000" || !bkashRes.paymentID || !bkashRes.bkashURL) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      bkashRes.statusMessage || "Failed to initialize bKash checkout.",
    );
  }

  // Step 3: Record pending payment in database
  const payment = await prisma.payment.create({
    data: {
      userId,
      businessId: business.id,
      purpose: "PRODUCT_SLOT",
      amount: totalAmount,
      currency: "BDT",
      status: "PENDING",
      merchantInvoiceNumber,
      bkashPaymentId: bkashRes.paymentID,
      slotsUnlocked: quantity,
      bkashRawResponse: bkashRes as any,
    },
    include: {
      business: { select: { id: true, name: true, slug: true } },
    },
  });

  return {
    paymentId: payment.id,
    bkashURL: bkashRes.bkashURL,
    paymentID: bkashRes.paymentID,
    merchantInvoiceNumber,
    amount: totalAmount,
    currency: "BDT",
    slotsToUnlock: quantity,
  };
};

// ---------------------------------------------------------------------------
// Handle bKash Callback (Browser redirect flow)
// ---------------------------------------------------------------------------

const handleBkashCallback = async (query: IBkashCallbackQuery) => {
  const { paymentID, status } = query;
  const frontendBase = config.frontend_url;

  if (!paymentID) {
    return {
      redirectUrl: `${frontendBase}/payment/failed?message=${encodeURIComponent("Missing paymentID in bKash callback.")}`,
    };
  }

  const payment = await prisma.payment.findUnique({
    where: { bkashPaymentId: paymentID },
  });

  if (!payment) {
    return {
      redirectUrl: `${frontendBase}/payment/failed?message=${encodeURIComponent("Payment record not found.")}`,
    };
  }

  // Idempotency: If already finalized as SUCCESS, redirect to success
  if (payment.status === "SUCCESS") {
    return {
      redirectUrl: `${frontendBase}/payment/success?paymentId=${payment.id}&trxId=${payment.bkashTrxId ?? ""}&status=success`,
    };
  }

  // Handle Cancellation or Failure from bKash user action
  if (status === "cancel" || status === "failure") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === "cancel" ? "CANCELLED" : "FAILED",
        ipnPayload: query as any,
      },
    });

    return {
      redirectUrl: `${frontendBase}/payment/failed?paymentId=${payment.id}&status=${status}`,
    };
  }

  // Handle Success: Execute (capture) the payment with bKash
  try {
    const idToken = await bkashGrantToken();
    const execRes = await bkashExecutePayment(idToken, paymentID);

    // statusCode "0000" is the only authoritative success signal from bKash.
    // transactionStatus can vary ("Completed", "Initiated", etc.) across sandbox
    // and production — do not gate on it.
    if (execRes.statusCode === "0000") {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          bkashTrxId: execRes.trxID,
          bkashExecuteTime: parseBkashExecuteTime(execRes.paymentExecuteTime),
          bkashRawResponse: execRes as any,
          ipnPayload: query as any,
        },
      });

      return {
        redirectUrl: `${frontendBase}/payment/success?paymentId=${updatedPayment.id}&trxId=${execRes.trxID}&status=success`,
      };
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          bkashRawResponse: execRes as any,
          ipnPayload: query as any,
        },
      });

      const message = execRes.statusMessage || "Payment execution failed.";
      return {
        redirectUrl: `${frontendBase}/payment/failed?paymentId=${payment.id}&message=${encodeURIComponent(message)}`,
      };
    }
  } catch (err: any) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        ipnPayload: { error: err.message, query },
      },
    });

    return {
      redirectUrl: `${frontendBase}/payment/failed?paymentId=${payment.id}&message=${encodeURIComponent(err.message || "Execution exception")}`,
    };
  }
};

// ---------------------------------------------------------------------------
// Execute Payment Direct (JSON API for SPA / Mobile clients)
// ---------------------------------------------------------------------------

const executeBkashPaymentDirect = async (
  userId: string,
  userRole: string,
  paymentID: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: { bkashPaymentId: paymentID },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found.");
  }

  if (userRole !== "ADMIN" && payment.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this payment record.");
  }

  // Idempotency: Return immediately if already completed
  if (payment.status === "SUCCESS") {
    return serializePayment(payment);
  }

  const idToken = await bkashGrantToken();
  const execRes = await bkashExecutePayment(idToken, paymentID);

  if (execRes.statusCode === "0000") {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        bkashTrxId: execRes.trxID,
        bkashExecuteTime: parseBkashExecuteTime(execRes.paymentExecuteTime),
        bkashRawResponse: execRes as any,
      },
    });

    return serializePayment(updated);
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        bkashRawResponse: execRes as any,
      },
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      execRes.statusMessage || "Payment execution failed on bKash.",
    );
  }
};

// ---------------------------------------------------------------------------
// Query Status from bKash (Reconciliation / verification)
// ---------------------------------------------------------------------------

const queryBkashPaymentStatus = async (paymentId: string, userId: string, userRole: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found.");
  }

  if (userRole !== "ADMIN" && payment.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  }

  if (!payment.bkashPaymentId) {
    return serializePayment(payment);
  }

  const idToken = await bkashGrantToken();
  const queryRes = await bkashQueryPayment(idToken, payment.bkashPaymentId);

  return {
    payment: serializePayment(payment),
    bkashQuery: queryRes,
  };
};

// ---------------------------------------------------------------------------
// Payment History & Details
// ---------------------------------------------------------------------------

const getPaymentById = async (
  paymentId: string,
  userId: string,
  userRole: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      business: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found.");
  }

  if (userRole !== "ADMIN" && payment.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  }

  return serializePayment(payment);
};

const getMyPayments = async (userId: string, filters: IPaymentFilter) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.businessId) where.businessId = filters.businessId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: payments.map(serializePayment),
  };
};

const getAllPayments = async (filters: IPaymentFilter) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.businessId) where.businessId = filters.businessId;
  if (filters.userId) where.userId = filters.userId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: payments.map(serializePayment),
  };
};

export const PaymentService = {
  getListingQuota,
  initiateBkashPayment,
  handleBkashCallback,
  executeBkashPaymentDirect,
  queryBkashPaymentStatus,
  getPaymentById,
  getMyPayments,
  getAllPayments,
};

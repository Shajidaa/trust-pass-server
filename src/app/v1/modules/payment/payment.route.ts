import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

// ── Public Callback Routes (Called by bKash redirect) ─────────────────────────
// Both GET and POST are handled for resilience; both /callback and /bkash/callback
router.get("/callback", PaymentController.handleBkashCallback);
router.post("/callback", PaymentController.handleBkashCallback);
router.get("/bkash/callback", PaymentController.handleBkashCallback);
router.post("/bkash/callback", PaymentController.handleBkashCallback);

// ── Protected Seller / Admin Routes ──────────────────────────────────────────
// Check listing quota (Free 5 products status)
router.get("/quota", auth("SELLER", "ADMIN", "MODERATOR"), PaymentController.getListingQuota);

// Initiate bKash Payment for product listing slot(s)
router.post(
  "/bkash/create",
  auth("SELLER"),
  validateRequest(PaymentValidation.initiatePaymentSchema),
  PaymentController.initiateBkashPayment,
);

// Direct API execution for SPA or mobile client checkout
router.post(
  "/bkash/execute",
  auth("SELLER", "ADMIN", "MODERATOR"),
  validateRequest(PaymentValidation.executePaymentSchema),
  PaymentController.executeBkashPaymentDirect,
);

// Payment history for authenticated user
router.get(
  "/my-payments",
  auth("SELLER", "ADMIN", "MODERATOR"),
  PaymentController.getMyPayments,
);

// Admin / Moderator: view all system payments
router.get(
  "/admin/all",
  auth("ADMIN", "MODERATOR"),
  PaymentController.getAllPayments,
);

// Query live payment status from bKash
router.get(
  "/:id/bkash-status",
  auth("SELLER", "ADMIN"),
  PaymentController.queryBkashPaymentStatus,
);

// Get single payment details
router.get(
  "/:id",
  auth("SELLER", "ADMIN", "MODERATOR"),
  PaymentController.getPaymentById,
);

export const PaymentRoutes = router;

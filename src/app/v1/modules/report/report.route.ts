import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";
import { uploadSingle } from "../../../middlewares/upload";

const router = Router();

// CUSTOMER, SELLER
router.post(
  "/",
  auth("CUSTOMER", "SELLER"),
  uploadSingle,
  validateRequest(ReportValidation.createReportSchema),
  ReportController.createReport,
);

router.get("/me", auth("CUSTOMER", "SELLER"), ReportController.getMyReports);

// MODERATOR, ADMIN
router.get("/", auth("MODERATOR", "ADMIN"), ReportController.listAllReports);

router.patch(
  "/:id/status",
  auth("MODERATOR", "ADMIN"),
  validateRequest(ReportValidation.updateReportStatusSchema),
  ReportController.updateReportStatus,
);

// All authenticated roles — service enforces ownership for non-privileged
router.get(
  "/:id",
  auth("CUSTOMER", "SELLER", "MODERATOR", "ADMIN"),
  ReportController.getReportById,
);

export const ReportRoutes = router;

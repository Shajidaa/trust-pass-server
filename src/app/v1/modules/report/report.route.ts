import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";
import { uploadSingle } from "../../../middlewares/upload";

const router = Router();

// CUSTOMER, BUYER
router.post(
    "/",
    auth("CUSTOMER", "BUYER"),
    uploadSingle,
    validateRequest(ReportValidation.createReportSchema),
    ReportController.createReport,
);

router.get("/me", auth("CUSTOMER", "BUYER"), ReportController.getMyReports);

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
    auth("CUSTOMER", "BUYER", "MODERATOR", "ADMIN"),
    ReportController.getReportById,
);

export const ReportRoutes = router;

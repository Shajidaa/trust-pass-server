import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { VerificationController } from "./verification.controller";
import { VerificationValidation } from "./verification.validation";

// /api/v1/verifications
const verificationRouter = Router();


verificationRouter.get("/", auth("MODERATOR", "ADMIN"), VerificationController.listBusinessVerifications);
verificationRouter.get("/:id", auth("MODERATOR", "ADMIN"), VerificationController.getVerificationById);
verificationRouter.patch(
    "/:id/review",
    auth("MODERATOR", "ADMIN"),
    validateRequest(VerificationValidation.reviewBusinessVerificationSchema),
    VerificationController.reviewBusinessVerification,
);

// /api/v1/businesses/:id/verify  (merged into main router via mergeParams)
const businessVerifyRouter = Router({ mergeParams: true });
businessVerifyRouter.post("/", auth("BUYER"), VerificationController.submitVerification);

export { verificationRouter as VerificationRoutes, businessVerifyRouter as BusinessVerifyRouter };

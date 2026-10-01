import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { BusinessController } from "./business.controller";
import { BusinessValidation } from "./business.validation";

const router = Router();

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
router.get("/", BusinessController.listBusinesses);

router.get("/:id", BusinessController.getBusinessById);
router.get("/slug/:slug", BusinessController.getBusinessBySlug);

// ---------------------------------------------------------------------------
// Protected — SELLER (own business)
// ---------------------------------------------------------------------------
router.get("/me", auth("SELLER"), BusinessController.getMyBusinesses);
router.post(
  "/",
  auth("SELLER"),
  validateRequest(BusinessValidation.createBusinessSchema),
  BusinessController.createBusiness,
);

router.patch(
  "/:id",
  auth("SELLER"),
  validateRequest(BusinessValidation.updateBusinessSchema),
  BusinessController.updateBusiness,
);

router.patch(
  "/:id/address",
  auth("SELLER"),
  validateRequest(BusinessValidation.updateAddressSchema),
  BusinessController.updateBusinessAddress,
);

// SELLER deletes own, ADMIN can delete any — ownership check is in the service
router.delete(
  "/:id",
  auth("SELLER", "ADMIN"),
  BusinessController.deleteBusiness,
);

export const BusinessRoutes = router;

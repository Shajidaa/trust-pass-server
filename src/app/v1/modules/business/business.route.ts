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
// Protected — BUYER (own business)
// ---------------------------------------------------------------------------
router.get("/me", auth("BUYER"), BusinessController.getMyBusinesses);
router.post(
    "/",
    auth("BUYER"),
    validateRequest(BusinessValidation.createBusinessSchema),
    BusinessController.createBusiness,
);

router.patch(
    "/:id",
    auth("BUYER"),
    validateRequest(BusinessValidation.updateBusinessSchema),
    BusinessController.updateBusiness,
);

router.patch(
    "/:id/address",
    auth("BUYER"),
    validateRequest(BusinessValidation.updateAddressSchema),
    BusinessController.updateBusinessAddress,
);

// BUYER deletes own, ADMIN can delete any — ownership check is in the service
router.delete("/:id", auth("BUYER", "ADMIN"), BusinessController.deleteBusiness);

export const BusinessRoutes = router;

import { Router } from "express";
import auth from "../../../middlewares/auth";
import { uploadProductImages } from "../../../middlewares/upload";
import validateRequest from "../../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router({ mergeParams: true }); // mergeParams lets /:businessId flow in from parent

// Public — flat list
router.get("/", ProductController.listProducts);
router.get("/slug/:slug", ProductController.getProductBySlug);
router.get("/:id", ProductController.getProductById);

// Protected — SELLER
router.post(
  "/",
  auth("SELLER"),
  uploadProductImages,
  validateRequest(ProductValidation.createProductSchema),
  ProductController.createProduct,
);

router.patch(
  "/:id",
  auth("SELLER"),
  uploadProductImages,
  validateRequest(ProductValidation.updateProductSchema),
  ProductController.updateProduct,
);

// SELLER (own) | ADMIN (any) — ownership enforced in service
router.delete(
  "/:id",
  auth("SELLER", "ADMIN", "MODERATOR"),
  ProductController.deleteProduct,
);

export const ProductRoutes = router;

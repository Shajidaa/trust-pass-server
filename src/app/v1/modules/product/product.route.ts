import { Router } from "express";
import auth from "../../../middlewares/auth";
import { uploadProductImages } from "../../../middlewares/upload";
import validateRequest from "../../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

// Public
router.get("/", ProductController.listProducts);
router.get("/slug/:slug", ProductController.getProductBySlug);
router.get("/:id", ProductController.getProductById);

// Protected — SELLER
router.post(
  "/",
  auth("SELLER"),
  uploadProductImages, // parses multipart, populates req.files
  validateRequest(ProductValidation.createProductSchema),
  ProductController.createProduct,
);

router.patch(
  "/:id",
  auth("SELLER"),
  uploadProductImages, // new images appended; retainImagePublicIds controls what's kept
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

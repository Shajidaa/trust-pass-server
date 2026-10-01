import { Router } from "express";
import auth from "../../../middlewares/auth";
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
  validateRequest(ProductValidation.createProductSchema),
  ProductController.createProduct,
);

router.patch(
  "/:id",
  auth("SELLER"),
  validateRequest(ProductValidation.updateProductSchema),
  ProductController.updateProduct,
);

// SELLER (own) | ADMIN (any) — ownership enforced in service
router.delete("/:id", auth("SELLER", "ADMIN"), ProductController.deleteProduct);

export const ProductRoutes = router;

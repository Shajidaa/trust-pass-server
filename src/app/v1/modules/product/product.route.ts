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

// Protected — BUYER
router.post(
    "/",
    auth("BUYER"),
    validateRequest(ProductValidation.createProductSchema),
    ProductController.createProduct,
);

router.patch(
    "/:id",
    auth("BUYER"),
    validateRequest(ProductValidation.updateProductSchema),
    ProductController.updateProduct,
);

// BUYER (own) | ADMIN (any) — ownership enforced in service
router.delete("/:id", auth("BUYER", "ADMIN"), ProductController.deleteProduct);

export const ProductRoutes = router;

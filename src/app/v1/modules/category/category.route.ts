import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = Router();

// Public
router.get("/", CategoryController.listCategories);
router.get("/:id", CategoryController.getCategoryById);

// Admin only
router.post(
    "/",
    auth("ADMIN"),
    validateRequest(CategoryValidation.createCategorySchema),
    CategoryController.createCategory,
);

router.patch(
    "/:id",
    auth("ADMIN"),
    validateRequest(CategoryValidation.updateCategorySchema),
    CategoryController.updateCategory,
);

router.delete("/:id", auth("ADMIN"), CategoryController.deleteCategory);

export const CategoryRoutes = router;

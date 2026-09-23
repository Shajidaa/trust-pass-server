import { Router } from "express";
// import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { AuthController } from "./auth.contorller";
import { AuthValidation } from "./auth.validation";
import auth from "../../../middlewares/auth";

const router = Router();

// Public
router.post("/register", validateRequest(AuthValidation.registerValidationSchema), AuthController.registerUser);
router.post("/login", validateRequest(AuthValidation.loginValidationSchema), AuthController.loginUser);

// Protected
router.get("/me", auth(), AuthController.getCurrentUser);
router.post("/logout", auth(), AuthController.logoutUser);
router.post("/change-password", auth(), validateRequest(AuthValidation.changePasswordValidationSchema), AuthController.changePassword);

export const AuthRoutes = router;

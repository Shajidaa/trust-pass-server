import { Router } from "express";

import validateRequest from "../../../middlewares/validateRequest";

import { AuthValidation } from "./auth.validation";

const router = Router();

// Public routes
router.post(
  "/register",
  validateRequest(AuthValidation.registerValidationSchema),
  () => {},
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  () => {},
);

// Protected routes (Requires valid session)
router.get("/me", () => {});

router.post("/logout", () => {});

router.post(
  "/change-password",

  validateRequest(AuthValidation.changePasswordValidationSchema),
  () => {},
);

export const AuthRoutes = router;

import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { AuthController } from "./auth.contorller";
import { AuthValidation } from "./auth.validation";

const router = Router();

// Public
router.post("/register",
    validateRequest(AuthValidation.registerValidationSchema),
    AuthController.registerUser,
);

router.post("/verify-otp",
    validateRequest(AuthValidation.verifyEmailOtpValidationSchema),
    AuthController.verifyEmailOtp,
);

router.post("/resend-otp",
    validateRequest(AuthValidation.resendOtpValidationSchema),
    AuthController.resendOtp,
);

router.post("/login",
    validateRequest(AuthValidation.loginValidationSchema),
    AuthController.loginUser,
);

// Protected
router.post("/logout", auth(), AuthController.logoutUser);
router.post("/change-password", auth(), validateRequest(AuthValidation.changePasswordValidationSchema), AuthController.changePassword);

export const AuthRoutes = router;

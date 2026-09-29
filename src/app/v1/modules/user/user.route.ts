import { Router } from "express";
import auth from "../../../middlewares/auth";
import { uploadSingle } from "../../../middlewares/upload";
import validateRequest from "../../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const userRouter = Router(); // /api/v1/users
const profileRouter = Router(); // /api/v1/profile

// ---------------------------------------------------------------------------
// /api/v1/users
// ---------------------------------------------------------------------------

userRouter.get("/me", auth(), UserController.getMe);
userRouter.patch(
  "/me",
  auth(),
  validateRequest(UserValidation.updateUserSchema),
  UserController.updateMe,
);

// ADMIN

userRouter.get("/:id", auth("ADMIN"), UserController.getUserById);
userRouter.patch(
  "/:id/role",
  auth("ADMIN"),
  validateRequest(UserValidation.updateRoleSchema),
  UserController.updateUserRole,
);
userRouter.delete("/:id", auth("ADMIN"), UserController.deleteUser);

// ---------------------------------------------------------------------------
// /api/v1/profile
// ---------------------------------------------------------------------------

profileRouter.get("/me", auth(), UserController.getMyProfile);
profileRouter.patch(
  "/me",
  auth(),
  validateRequest(UserValidation.updateProfileSchema),
  UserController.updateMyProfile,
);
profileRouter.post(
  "/me/photo",
  auth(),
  uploadSingle,
  UserController.uploadProfilePhoto,
);

export const UserRoutes = userRouter;
export const ProfileRoutes = profileRouter;

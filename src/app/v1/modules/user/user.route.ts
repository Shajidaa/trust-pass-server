import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";

const router = Router();

// Current User Profile endpoints
router.get("/profile", auth(), () => {});

router.patch(
  "/profile",
  auth(),

  () => {},
);

// Admin & Moderator endpoints
router.get("/", auth("ADMIN"), () => {});

router.get("/:id", auth("ADMIN", "MODERATOR"), () => {});

router.patch(
  "/:id/status",
  auth("ADMIN"),

  () => {},
);

export const UserRoutes = router;

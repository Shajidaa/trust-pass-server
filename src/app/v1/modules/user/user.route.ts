import { Router } from "express";

import validateRequest from "../../../middlewares/validateRequest";

const router = Router();

// Current User Profile endpoints
router.get("/profile", () => {});

router.patch(
  "/profile",

  () => {},
);

// Admin & Moderator endpoints
router.get("/", () => {});

router.get("/:id", () => {});

router.patch(
  "/:id/status",

  () => {},
);

export const UserRoutes = router;

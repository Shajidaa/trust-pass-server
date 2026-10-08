import { Router } from "express";
import auth from "../../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = Router();

router.get("/dashboard", auth("ADMIN"), AdminController.getDashboardStats);
router.get("/businesses", auth("ADMIN"), AdminController.getAdminBusinesses);
router.get("/reports", auth("ADMIN"), AdminController.getAdminReports);
router.get("/users", auth("ADMIN"), AdminController.getAdminUsers);

export const AdminRoutes = router;

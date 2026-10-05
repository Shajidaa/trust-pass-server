import { Router } from "express";
import auth from "../../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = Router();

router.get("/dashboard", AdminController.getDashboardStats);
router.get("/businesses", AdminController.getAdminBusinesses);
router.get("/reports", AdminController.getAdminReports);
router.get("/users", AdminController.getAdminUsers);

export const AdminRoutes = router;

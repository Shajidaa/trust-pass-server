import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BusinessRoutes } from "../modules/business/business.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { BusinessDocumentRoutes, DocumentRoutes } from "../modules/document/document.route";
import { ProductController } from "../modules/product/product.controller";
import { ProductRoutes } from "../modules/product/product.route";
import { TrustRulesRoutes, TrustScoreRoutes } from "../modules/trust/trust.route";
import { UserRoutes, ProfileRoutes } from "../modules/user/user.route";
import { AdminRoutes } from "../modules/admin/admin.route";
import { NotificationRoutes } from "../modules/notification/notification.route";
import { ReportRoutes } from "../modules/report/report.route";
import { BusinessVerifyRouter, VerificationRoutes } from "../modules/verification/verification.routes";

const v1Routes: Router = Router();

interface IRoutes {
  path: string;
  router: Router;
}

const routes: IRoutes[] = [
  { path: "/users", router: UserRoutes },
  { path: "/profile", router: ProfileRoutes },
  { path: "/auth", router: AuthRoutes },
  { path: "/categories", router: CategoryRoutes },
  { path: "/businesses", router: BusinessRoutes },
  { path: "/products", router: ProductRoutes },
  { path: "/trust-scores", router: TrustScoreRoutes },
  { path: "/trust-rules", router: TrustRulesRoutes },
];

routes.forEach((route) => {
  v1Routes.use(route.path, route.router);
});

// Nested: GET /api/v1/businesses/:id/products
v1Routes.get("/businesses/:id/products", ProductController.listBusinessProducts);

// Nested: /api/v1/businesses/:id/documents
v1Routes.use("/businesses/:id/documents", BusinessDocumentRoutes);

// Flat: /api/v1/documents/:id
v1Routes.use("/documents", DocumentRoutes);

// POST /api/v1/businesses/:id/verify
v1Routes.use("/businesses/:id/verify", BusinessVerifyRouter);

// /api/v1/verifications
v1Routes.use("/verifications", VerificationRoutes);

// /api/v1/reports
v1Routes.use("/reports", ReportRoutes);

// /api/v1/notifications
v1Routes.use("/notifications", NotificationRoutes);

// /api/v1/admin
v1Routes.use("/admin", AdminRoutes);

export default v1Routes;

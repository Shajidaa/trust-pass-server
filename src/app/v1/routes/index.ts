import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { TrustRulesRoutes, TrustScoreRoutes } from "../modules/trust/trust.route";
import { UserRoutes } from "../modules/user/user.route";

const v1Routes: Router = Router();

interface IRoutes {
  path: string;
  router: Router;
}

const routes: IRoutes[] = [
  { path: "/user", router: UserRoutes },
  { path: "/auth", router: AuthRoutes },
  { path: "/categories", router: CategoryRoutes },
  { path: "/trust-scores", router: TrustScoreRoutes },
  { path: "/trust-rules", router: TrustRulesRoutes },
];

routes.forEach((route) => {
  v1Routes.use(route.path, route.router);
});

export default v1Routes;

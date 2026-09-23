import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { TrustController } from "./trust.controller";
import { TrustValidation } from "./trust.validation";

const scoreRouter = Router();
const rulesRouter = Router();

// ---------------------------------------------------------------------------
// /api/v1/trust-scores
// ---------------------------------------------------------------------------

// Public
scoreRouter.get("/business/:id", TrustController.getTrustScoreHistory);

// Moderator / Admin — trigger a recalculation
scoreRouter.post(
  "/business/:id/recalculate",
  auth("MODERATOR", "ADMIN"),
  TrustController.recalculateTrustScore,
);

// ---------------------------------------------------------------------------
// /api/v1/trust-rules
// ---------------------------------------------------------------------------

rulesRouter.get(
  "/",
  auth("MODERATOR", "ADMIN"),
  TrustController.listTrustRules,
);

rulesRouter.post(
  "/",
  auth("ADMIN"),
  validateRequest(TrustValidation.createTrustRuleSchema),
  TrustController.createTrustRule,
);

rulesRouter.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(TrustValidation.updateTrustRuleSchema),
  TrustController.updateTrustRule,
);

rulesRouter.delete("/:id", auth("ADMIN"), TrustController.deleteTrustRule);

export const TrustScoreRoutes = scoreRouter;
export const TrustRulesRoutes = rulesRouter;

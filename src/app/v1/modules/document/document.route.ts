import { Router } from "express";
import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { uploadSingle } from "../../../middlewares/upload";
import { DocumentController } from "./document.controller";
import { DocumentValidation } from "./document.validation";

// ---------------------------------------------------------------------------
// /api/v1/businesses/:id/documents
// ---------------------------------------------------------------------------
const businessDocRouter = Router({ mergeParams: true });

businessDocRouter.post(
    "/",
    auth("BUYER"),
    uploadSingle,                                                   // multer parses multipart
    validateRequest(DocumentValidation.uploadDocumentSchema),       // validates body fields
    DocumentController.uploadDocument,
);

businessDocRouter.get(
    "/",
    auth("BUYER", "MODERATOR", "ADMIN"),
    DocumentController.listBusinessDocuments,
);

// ---------------------------------------------------------------------------
// /api/v1/documents/:id
// ---------------------------------------------------------------------------
const documentRouter = Router();

documentRouter.get(
    "/:id",
    auth("BUYER", "MODERATOR", "ADMIN"),
    DocumentController.getDocumentById,
);

documentRouter.delete(
    "/:id",
    auth("BUYER", "ADMIN"),
    DocumentController.deleteDocument,
);

export { businessDocRouter as BusinessDocumentRoutes, documentRouter as DocumentRoutes };

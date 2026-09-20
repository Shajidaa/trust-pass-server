import cors from "cors";
import express, { Application, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/libs/auth";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFoundHandler from "./app/middlewares/notFoundHandler";
import v1Routes from "./app/v1/routes";

const app: Application = express();

// 1. CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, "http://localhost:3000", "http://localhost:5173"] : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

// 2. Native Better Auth Handler (Express 5 wildcard routing)
app.all("/api/auth/*splat", toNodeHandler(auth));

// 3. Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Root Health Check Endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Trust Pass Server API is running smoothly 🚀",
    version: "1.0.0",
  });
});

// 5. API V1 Application Routes (Module Pattern)
app.use("/api/v1", v1Routes);

// 6. Global 404 Not Found Handler
app.use(notFoundHandler);

// 7. Centralized Global Error Handler
app.use(globalErrorHandler);

export default app;

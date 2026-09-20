import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import AppError from "../errors/AppError";

interface IErrorSource {
  path: string | number;
  message: string;
}

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode: number = 500;
  let message: string = "Something went wrong!";
  let errorSources: IErrorSource[] = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];

  // 1. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errorSources = err.issues.map((issue) => ({
      path: String(issue.path[issue.path.length - 1] ?? ""),
      message: issue.message,
    }));
  }
  // 2. Handle Custom AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }
  // 3. Handle Prisma Known Request Errors
  else if (err?.code === "P2002") {
    statusCode = 409;
    const target = (err.meta?.target as string[]) || [];
    message = `Duplicate key violation: ${target.join(", ")} already exists.`;
    errorSources = [
      {
        path: target.join(", "),
        message,
      },
    ];
  } else if (err?.code === "P2025") {
    statusCode = 404;
    message = (err.meta?.cause as string) || "Record not found.";
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  }
  // 4. Handle Better Auth or other API Errors with status property
  else if (err?.status && typeof err.status === "number") {
    statusCode = err.status;
    message = err.message || err.body?.message || "Authentication Error";
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  }
  // 5. Handle Generic Errors
  else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorSources,
    ...(process.env.NODE_ENV === "development" ? { stack: err?.stack } : {}),
  });
};

export default globalErrorHandler;

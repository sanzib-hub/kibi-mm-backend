import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/errors/AppError";

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    const response: any = {
      success: false,
      message: error.message,
    };

    // Add details array for ValidationError
    if (error instanceof ValidationError && error.details.length > 0) {
      response.details = error.details;
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle unknown errors
  console.error("Unhandled error:", error);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};


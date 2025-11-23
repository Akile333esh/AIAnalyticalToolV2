import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ err }, "Unhandled error");

  const status = err.statusCode || err.status || 500;
  const message =
    err.message || "Internal server error";

  res.status(status).json({
    message,
  });
}

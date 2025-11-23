import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Not authenticated" });
    }

    if (user.role !== requiredRole) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
}

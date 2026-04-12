import { Request, Response, NextFunction } from "express";
import { type AppRole } from "../lib/roles";

export const roleMiddleware = (allowedRoles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "User role not found",
      });
    }

    // Admin has full access
    if (userRole === "admin") {
      return next();
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole as AppRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    return next();
  };
};

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtUserPayload = {
  id?: number | string;
  sub?: number | string;
  name?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing or invalid",
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    const rawUserId = decoded.id ?? decoded.sub;
    const userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;

    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = {
      id: userId,
      name: decoded.name ?? "",
      email: decoded.email ?? "",
      role: decoded.role ?? "technician",
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

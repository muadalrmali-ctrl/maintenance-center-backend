import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { db } from "../db";
import { branches, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { permissionsService } from "../modules/permissions/permissions.service";

type JwtUserPayload = {
  id?: number | string;
  sub?: number | string;
  name?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export const authMiddleware = async (
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

    const foundUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        branchId: users.branchId,
        branchName: branches.name,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(eq(users.id, userId))
      .limit(1);

    const user = foundUsers[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user no longer exists",
      });
    }

    const permissions = await permissionsService.getUserPermissionKeys(user.id, user.role);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
      branchId: user.branchId ?? null,
      branchName: user.branchName ?? null,
      isAdmin: user.role === "admin",
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

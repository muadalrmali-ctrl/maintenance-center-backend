import { NextFunction, Request, Response } from "express";

export const requestIsAdmin = (req: Request) => req.user?.role === "admin" || req.user?.isAdmin === true;

export const requestHasPermission = (req: Request, permissionKey: string) => {
  if (requestIsAdmin(req)) {
    return true;
  }

  return req.user?.permissions?.includes(permissionKey) ?? false;
};

export const requestHasAnyPermission = (req: Request, permissionKeys: string[]) =>
  permissionKeys.some((permissionKey) => requestHasPermission(req, permissionKey));

export const requirePermission = (permissionKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (requestHasPermission(req, permissionKey)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
      requiredPermission: permissionKey,
    });
  };
};

export const requireAnyPermission = (permissionKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (requestHasAnyPermission(req, permissionKeys)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
      requiredPermissions: permissionKeys,
    });
  };
};

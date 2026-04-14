import { Request, Response } from "express";
import { invitationService } from "./invitation.service";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  staffRoles,
} from "./invitation.validation";
import type { AppRole } from "../../lib/roles";

const getRequestUserId = (req: Request) => {
  const rawUserId = req.user?.id ?? (req.user as any)?.sub;
  return typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;
};

const logInvitationError = (action: string, error: unknown) => {
  console.error(
    `[invitations:${action}]`,
    error instanceof Error ? error.message : error
  );
};

const getTokenParam = (req: Request) => {
  const token = req.params.token;
  return Array.isArray(token) ? token[0] : token;
};

const getRequestUserRole = (req: Request) => req.user?.role as AppRole | undefined;

const canCreateInvitationForRole = (
  creatorRole: AppRole | undefined,
  invitedRole: (typeof staffRoles)[number]
) => {
  if (!creatorRole) return false;
  if (creatorRole === "admin") return true;
  if (creatorRole === "maintenance_manager") {
    return invitedRole === "technician" || invitedRole === "store_manager" || invitedRole === "receptionist";
  }

  if (creatorRole === "technician_manager") {
    return invitedRole === "technician";
  }

  return false;
};

export const invitationController = {
  async create(req: Request, res: Response) {
    try {
      const validation = createInvitationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const invitedBy = getRequestUserId(req);
      const invitedByRole = getRequestUserRole(req);
      if (!invitedBy || Number.isNaN(invitedBy)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!canCreateInvitationForRole(invitedByRole, validation.data.role)) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to create an invitation for this role",
        });
      }

      const invitation = await invitationService.createInvitation({
        ...validation.data,
        invitedBy,
      });

      return res.status(201).json({
        success: true,
        message: "Invitation created successfully",
        data: invitation,
      });
    } catch (error) {
      logInvitationError("create", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async list(_req: Request, res: Response) {
    try {
      const invitations = await invitationService.listInvitations();

      return res.status(200).json({
        success: true,
        message: "Invitations retrieved successfully",
        data: invitations,
      });
    } catch (error) {
      logInvitationError("list", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve invitations",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getByToken(req: Request, res: Response) {
    try {
      const invitation = await invitationService.getInvitationByToken(
        getTokenParam(req)
      );

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: "Invitation not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invitation retrieved successfully",
        data: invitation,
      });
    } catch (error) {
      logInvitationError("getByToken", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async accept(req: Request, res: Response) {
    try {
      const validation = acceptInvitationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const user = await invitationService.acceptInvitation({
        token: getTokenParam(req),
        ...validation.data,
      });

      return res.status(201).json({
        success: true,
        message: "Invitation accepted successfully",
        data: user,
      });
    } catch (error) {
      logInvitationError("accept", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to accept invitation",
      });
    }
  },

  async revoke(req: Request, res: Response) {
    try {
      const invitationId = Number(req.params.id);
      const revokedBy = getRequestUserId(req);

      if (!Number.isFinite(invitationId) || !revokedBy || Number.isNaN(revokedBy)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invitation id",
        });
      }

      const invitation = await invitationService.revokeInvitation({
        id: invitationId,
        revokedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Invitation revoked successfully",
        data: invitation,
      });
    } catch (error) {
      logInvitationError("revoke", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to revoke invitation",
      });
    }
  },
};

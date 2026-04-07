import { Request, Response } from "express";
import { invitationService } from "./invitation.service";
import {
  acceptInvitationSchema,
  createInvitationSchema,
} from "./invitation.validation";

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
      if (!invitedBy || Number.isNaN(invitedBy)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
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
};

import { Request, Response } from "express";
import { authService } from "./auth.service";
import { permissionsService } from "../permissions/permissions.service";

export const authController = {
  async getTeamMemberDetails(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      const member = await authService.getTeamMemberDetails(id);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Team member not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Team member details retrieved successfully",
        data: member,
      });
    } catch (error) {
      console.error(
        "[auth:getTeamMemberDetails]",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve team member details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getTeamMembers(req: Request, res: Response) {
    try {
      const members = await authService.getTeamMembers();

      return res.status(200).json({
        success: true,
        message: "Team members retrieved successfully",
        data: members,
      });
    } catch (error) {
      console.error(
        "[auth:getTeamMembers]",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve team members",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getTeamMemberPermissions(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      const memberPermissions = await permissionsService.getUserPermissions(id);

      if (!memberPermissions) {
        return res.status(404).json({
          success: false,
          message: "Team member not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Team member permissions retrieved successfully",
        data: memberPermissions,
      });
    } catch (error) {
      console.error("[auth:getTeamMemberPermissions]", error instanceof Error ? error.message : error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve team member permissions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateTeamMemberPermissions(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const permissionKeys = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      if (!permissionKeys.every((key: unknown) => typeof key === "string")) {
        return res.status(400).json({
          success: false,
          message: "permissions must be an array of permission keys",
        });
      }

      const updatedKeys = await permissionsService.replaceUserPermissions(id, permissionKeys);

      return res.status(200).json({
        success: true,
        message: "Team member permissions updated successfully",
        data: {
          userId: id,
          permissions: updatedKeys,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update team member permissions",
      });
    }
  },

  async updateTeamMember(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      const updatedMember = await authService.updateTeamMember(id, {
        name: typeof req.body?.name === "string" ? req.body.name : undefined,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        phone: req.body?.phone === null || typeof req.body?.phone === "string" ? req.body.phone : undefined,
        role: typeof req.body?.role === "string" ? req.body.role : undefined,
        status: typeof req.body?.status === "string" ? req.body.status : undefined,
        receptionPointId:
          req.body?.receptionPointId === null
            ? null
            : req.body?.receptionPointId === undefined || req.body?.receptionPointId === ""
              ? undefined
              : Number(req.body.receptionPointId),
      });

      return res.status(200).json({
        success: true,
        message: "Team member updated successfully",
        data: updatedMember,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update team member";
      return res.status(message === "Team member not found" ? 404 : 400).json({
        success: false,
        message,
      });
    }
  },

  async deleteTeamMember(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      if (req.user?.id === id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own active admin account",
        });
      }

      const updatedMember = await authService.deactivateTeamMember(id);

      return res.status(200).json({
        success: true,
        message: "Team member deactivated successfully",
        data: updatedMember,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete team member";
      return res.status(message === "Team member not found" ? 404 : 400).json({
        success: false,
        message,
      });
    }
  },

  async createTeamMemberPasswordReset(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const createdBy = req.user?.id;

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team member ID",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await authService.createPasswordResetLink({
        userId: id,
        createdBy,
        resetBaseUrl: req.get("origin") || undefined,
      });

      return res.status(201).json({
        success: true,
        message: result.emailSent
          ? "Password reset link sent successfully"
          : "Password reset link created successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create password reset link",
      });
    }
  },

  async verifyPasswordResetToken(req: Request, res: Response) {
    try {
      const token = String(req.params.token || "");

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Reset token is required",
        });
      }

      const result = await authService.verifyPasswordResetToken(token);

      return res.status(200).json({
        success: true,
        message: "Password reset token is valid",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Invalid password reset token",
      });
    }
  },

  async completePasswordReset(req: Request, res: Response) {
    try {
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Reset token is required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }

      const result = await authService.completePasswordReset({ token, password });

      return res.status(200).json({
        success: true,
        message: "Password reset successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to reset password",
      });
    }
  },

  async getTechnicians(req: Request, res: Response) {
    try {
      const technicians = await authService.getTechnicians();

      return res.status(200).json({
        success: true,
        message: "Technicians retrieved successfully",
        data: technicians,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve technicians",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }

      const user = await authService.registerUser({
        name,
        email,
        password,
        role,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to register user",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async activateTeamAccounts(req: Request, res: Response) {
    try {
      const accounts = Array.isArray(req.body?.accounts) ? req.body.accounts : [];

      if (!accounts.length) {
        return res.status(400).json({
          success: false,
          message: "At least one staff account is required",
        });
      }

      const invalidAccount = accounts.find(
        (account: {
          name?: unknown;
          email?: unknown;
          role?: unknown;
          temporaryPassword?: unknown;
        }) =>
          !account ||
          typeof account.name !== "string" ||
          typeof account.email !== "string" ||
          typeof account.role !== "string" ||
          (account.temporaryPassword != null && typeof account.temporaryPassword !== "string")
      );

      if (invalidAccount) {
        return res.status(400).json({
          success: false,
          message: "Each account must include name, email, role, and optional temporaryPassword",
        });
      }

      const activatedAccounts = await authService.activateStaffAccounts(accounts);

      return res.status(200).json({
        success: true,
        message: "Staff accounts activated successfully",
        data: activatedAccounts,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to activate staff accounts",
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const loginResult = await authService.loginUser({ email, password });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: loginResult,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  },
};

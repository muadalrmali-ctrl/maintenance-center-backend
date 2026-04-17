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
      const { name, email, password, role, branchId } = req.body;

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
        branchId,
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
          branchId?: unknown;
        }) =>
          !account ||
          typeof account.name !== "string" ||
          typeof account.email !== "string" ||
          typeof account.role !== "string" ||
          (account.temporaryPassword != null && typeof account.temporaryPassword !== "string") ||
          (account.branchId != null && typeof account.branchId !== "number")
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

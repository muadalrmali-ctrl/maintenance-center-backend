import { Request, Response } from "express";
import { authService } from "./auth.service";

export const authController = {
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

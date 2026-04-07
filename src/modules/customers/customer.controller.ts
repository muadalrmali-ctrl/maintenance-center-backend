import { Request, Response } from "express";
import { customerService } from "./customer.service";

export const customerController = {
  async create(req: Request, res: Response) {
    try {
      const { name, phone, address, notes } = req.body;
      const createdBy = req.user?.id;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: "Name and phone are required",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const customer = await customerService.createCustomer({
        name,
        phone,
        address,
        notes,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create customer",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const customers = await customerService.getCustomers();

      return res.status(200).json({
        success: true,
        message: "Customers retrieved successfully",
        data: customers,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve customers",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const customer = await customerService.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Customer retrieved successfully",
        data: customer,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve customer",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getDetails(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const details = await customerService.getCustomerDetails(id);

      if (!details) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Customer details retrieved successfully",
        data: details,
      });
    } catch (error) {
      console.error("[customers:getDetails]", error instanceof Error ? error.message : error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve customer details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { name, phone, address, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const customer = await customerService.updateCustomer(id, {
        name,
        phone,
        address,
        notes,
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: customer,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update customer",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};

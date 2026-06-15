import { z } from "zod";

export const staffRoles = [
  "technician",
  "store_manager",
  "receptionist",
  "technician_manager",
  "maintenance_manager",
  "reception_point_user",
  "admin",
] as const;

export const createInvitationSchema = z.object({
  role: z.enum(staffRoles),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  receptionPointId: z.number().int().positive().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
}).refine((data) => data.role !== "reception_point_user" || Boolean(data.receptionPointId), {
  message: "receptionPointId is required for reception point users",
  path: ["receptionPointId"],
});

export const acceptInvitationSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(8),
});

export const APP_ROLES = [
  "admin",
  "receptionist",
  "technician",
  "store_manager",
  "technician_manager",
  "maintenance_manager",
  "branch_user",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const TEAM_ROLES = [
  "technician",
  "technician_manager",
  "store_manager",
  "receptionist",
  "maintenance_manager",
  "admin",
  "branch_user",
] as const;

export const isAppRole = (role: string): role is AppRole =>
  (APP_ROLES as readonly string[]).includes(role);

export const roleLabels: Record<AppRole, string> = {
  admin: "إدارة",
  receptionist: "موظف استقبال",
  technician: "فني صيانة",
  store_manager: "مسؤول مخزن",
  technician_manager: "مسؤول الفنيين",
  maintenance_manager: "مدير الصيانة",
  branch_user: "مستخدم فرع",
};

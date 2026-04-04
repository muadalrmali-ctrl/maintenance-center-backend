import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("technician"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  applianceType: text("appliance_type").notNull(),
  brand: text("brand").notNull(),
  modelName: text("model_name").notNull(),
  modelCode: text("model_code"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseCode: text("case_code").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  deviceId: integer("device_id").references(() => devices.id),
  status: text("status").notNull().default("received"),
  customerComplaint: text("customer_complaint").notNull(),
  initialCheckNotes: text("initial_check_notes"),
  diagnosisNotes: text("diagnosis_notes"),
  internalNotes: text("internal_notes"),
  deliveryDueAt: timestamp("delivery_due_at"),
  executionStartedAt: timestamp("execution_started_at"),
  executionDueAt: timestamp("execution_due_at"),
  finalResult: text("final_result"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  assignedTechnicianId: integer("assigned_technician_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caseStatusHistory = pgTable("case_status_history", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  categoryId: integer("category_id").references(() => inventoryCategories.id),
  brand: text("brand"),
  model: text("model"),
  quantity: integer("quantity").notNull().default(0),
  minimumStock: integer("minimum_stock"),
  unitCost: numeric("unit_cost").notNull(),
  sellingPrice: numeric("selling_price"),
  location: text("location"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id),
  movementType: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseParts = pgTable("case_parts", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  notes: text("notes"),
  addedBy: integer("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caseServices = pgTable("case_services", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  serviceName: text("service_name").notNull(),
  description: text("description"),
  unitPrice: numeric("unit_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: numeric("total_price").notNull(),
  performedBy: integer("performed_by").references(() => users.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal").notNull(),
  discount: numeric("discount").notNull().default("0"),
  tax: numeric("tax").notNull().default("0"),
  total: numeric("total").notNull(),
  notes: text("notes"),
  issuedAt: timestamp("issued_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  itemType: text("item_type").notNull(),
  referenceId: integer("reference_id"),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileUrl: text("file_url").notNull(),
  assetType: text("asset_type").notNull(),
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id"),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  providerResponse: text("provider_response"),
  sentBy: integer("sent_by"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
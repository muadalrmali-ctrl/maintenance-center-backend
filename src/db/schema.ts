import { pgTable, serial, text, timestamp, integer, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core";

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("technician"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  group: text("group_name").notNull(),
  parentKey: text("parent_key"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userPermissionUnique: uniqueIndex("user_permissions_user_permission_unique").on(table.userId, table.permissionId),
  })
);

export const staffInvitations = pgTable("staff_invitations", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  invitedBy: integer("invited_by").references(() => users.id),
  acceptedBy: integer("accepted_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseCode: text("case_code").notNull().unique(),
  caseType: text("case_type").notNull().default("internal"),
  sourceType: text("source_type").notNull().default("main_center"),
  branchId: integer("branch_id").references(() => branches.id),
  branchCreatedBy: integer("branch_created_by").references(() => users.id),
  branchNotes: text("branch_notes"),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  status: text("status").notNull().default("received"),
  customerComplaint: text("customer_complaint").notNull(),
  priority: text("priority").notNull().default("متوسطة"),
  maintenanceTeam: text("maintenance_team"),
  technicianName: text("technician_name"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  deliveryDueAt: timestamp("delivery_due_at"),
  executionStartedAt: timestamp("execution_started_at"),
  executionDueAt: timestamp("execution_due_at"),
  executionDurationDays: integer("execution_duration_days").notNull().default(0),
  executionDurationHours: integer("execution_duration_hours").notNull().default(0),
  executionTimerStartedAt: timestamp("execution_timer_started_at"),
  executionTimerPausedAt: timestamp("execution_timer_paused_at"),
  executionTotalPausedSeconds: integer("execution_total_paused_seconds").notNull().default(0),
  executionCompletedAt: timestamp("execution_completed_at"),
  waitingPartInventoryItemId: integer("waiting_part_inventory_item_id").references(() => inventoryItems.id),
  waitingPartName: text("waiting_part_name"),
  waitingPartNotes: text("waiting_part_notes"),
  waitingPartImageUrl: text("waiting_part_image_url"),
  diagnosisNote: text("diagnosis_note"),
  faultCause: text("fault_cause"),
  latestMessage: text("latest_message"),
  latestMessageChannel: text("latest_message_channel"),
  latestMessageSentAt: timestamp("latest_message_sent_at"),
  customerApprovedAt: timestamp("customer_approved_at"),
  customerApprovedBy: integer("customer_approved_by").references(() => users.id),
  postRepairCompletedWork: text("post_repair_completed_work"),
  postRepairTested: boolean("post_repair_tested").notNull().default(false),
  postRepairTestCount: integer("post_repair_test_count").notNull().default(1),
  postRepairCleaned: boolean("post_repair_cleaned").notNull().default(false),
  postRepairRecommendations: text("post_repair_recommendations"),
  postRepairImages: text("post_repair_images"),
  postRepairVideos: text("post_repair_videos"),
  postRepairDamagedPartImages: text("post_repair_damaged_part_images"),
  postRepairNote: text("post_repair_note"),
  notRepairableReason: text("not_repairable_reason"),
  readyNotificationMessage: text("ready_notification_message"),
  readyNotificationChannel: text("ready_notification_channel"),
  readyNotificationSentAt: timestamp("ready_notification_sent_at"),
  centerReceivedAt: timestamp("center_received_at"),
  centerReceivedBy: integer("center_received_by").references(() => users.id),
  centerReceiptNotes: text("center_receipt_notes"),
  customerReceivedAt: timestamp("customer_received_at"),
  operationFinalizedAt: timestamp("operation_finalized_at"),
  finalResult: text("final_result"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  imageUrl: text("image_url"),
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

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseCode: text("purchase_code").notNull().unique(),
  date: timestamp("date").notNull(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  purchaseType: text("purchase_type").notNull(),
  paymentMethod: text("payment_method").notNull(),
  receivingStatus: text("receiving_status").notNull().default("pending"),
  totalAmount: numeric("total_amount").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: integer("confirmed_by").references(() => users.id),
  stockAppliedAt: timestamp("stock_applied_at"),
  stockAppliedBy: integer("stock_applied_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchases.id),
  itemName: text("item_name").notNull(),
  itemType: text("item_type").notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost").notNull(),
  totalCost: numeric("total_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyExpenses = pgTable("daily_expenses", {
  id: serial("id").primaryKey(),
  expenseCode: text("expense_code").notNull().unique(),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  beneficiary: text("beneficiary").notNull(),
  description: text("description").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyCashRecords = pgTable("daily_cash_records", {
  id: serial("id").primaryKey(),
  cashCode: text("cash_code").notNull().unique(),
  date: timestamp("date").notNull(),
  shiftType: text("shift_type").notNull(),
  collectedAmount: numeric("collected_amount").notNull(),
  expensesAmount: numeric("expenses_amount").notNull().default("0"),
  manualAdjustment: numeric("manual_adjustment").notNull().default("0"),
  netAmount: numeric("net_amount").notNull(),
  handedToTreasuryAmount: numeric("handed_to_treasury_amount").notNull().default("0"),
  remainingWithEmployee: numeric("remaining_with_employee").notNull(),
  handoverStatus: text("handover_status").notNull().default("pending"),
  employeeId: integer("employee_id").references(() => users.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caseParts = pgTable("case_parts", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  notes: text("notes"),
  handoffStatus: text("handoff_status").notNull().default("pending"),
  deliveredAt: timestamp("delivered_at"),
  deliveredBy: integer("delivered_by").references(() => users.id),
  receivedAt: timestamp("received_at"),
  receivedBy: integer("received_by").references(() => users.id),
  returnedAt: timestamp("returned_at"),
  returnedBy: integer("returned_by").references(() => users.id),
  consumedAt: timestamp("consumed_at"),
  consumedBy: integer("consumed_by").references(() => users.id),
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
  caseId: integer("case_id").references(() => cases.id),
  customerId: integer("customer_id").references(() => customers.id),
  invoiceType: text("invoice_type").notNull().default("maintenance"),
  directCustomerName: text("direct_customer_name"),
  directCustomerPhone: text("direct_customer_phone"),
  invoiceNumber: text("invoice_number").notNull().unique(),
  saleCode: text("sale_code").unique(),
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal").notNull(),
  discount: numeric("discount").notNull().default("0"),
  tax: numeric("tax").notNull().default("0"),
  total: numeric("total").notNull(),
  notes: text("notes"),
  issuedAt: timestamp("issued_at"),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: integer("confirmed_by").references(() => users.id),
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
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  caseId: integer("case_id").references(() => cases.id),
  category: text("category"),
  fileName: text("file_name"),
  filePath: text("file_path"),
  publicUrl: text("public_url"),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  fileType: text("file_type").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  target: text("target").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

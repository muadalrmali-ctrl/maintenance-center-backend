CREATE TABLE "case_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_code" text NOT NULL,
	"customer_id" integer,
	"device_id" integer,
	"status" text DEFAULT 'received' NOT NULL,
	"customer_complaint" text NOT NULL,
	"initial_check_notes" text,
	"diagnosis_notes" text,
	"internal_notes" text,
	"delivery_due_at" timestamp,
	"execution_started_at" timestamp,
	"execution_due_at" timestamp,
	"final_result" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"assigned_technician_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cases_case_code_unique" UNIQUE("case_code")
);
--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_technician_id_users_id_fk" FOREIGN KEY ("assigned_technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
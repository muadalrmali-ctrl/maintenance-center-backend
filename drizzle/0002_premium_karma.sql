CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"appliance_type" text NOT NULL,
	"brand" text NOT NULL,
	"model_name" text NOT NULL,
	"model_code" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "address" text,
  "contact_person" text,
  "notes" text,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "purchases" (
  "id" serial PRIMARY KEY NOT NULL,
  "purchase_code" text NOT NULL UNIQUE,
  "date" timestamp NOT NULL,
  "supplier_id" integer NOT NULL,
  "purchase_type" text NOT NULL,
  "payment_method" text NOT NULL,
  "receiving_status" text NOT NULL DEFAULT 'pending',
  "total_amount" numeric NOT NULL,
  "notes" text,
  "created_by" integer NOT NULL,
  "confirmed_at" timestamp,
  "confirmed_by" integer,
  "stock_applied_at" timestamp,
  "stock_applied_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "purchase_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "purchase_id" integer NOT NULL,
  "item_name" text NOT NULL,
  "item_type" text NOT NULL,
  "inventory_item_id" integer,
  "quantity" integer NOT NULL,
  "unit_cost" numeric NOT NULL,
  "total_cost" numeric NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_expenses" (
  "id" serial PRIMARY KEY NOT NULL,
  "expense_code" text NOT NULL UNIQUE,
  "date" timestamp NOT NULL,
  "category" text NOT NULL,
  "amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "beneficiary" text NOT NULL,
  "description" text NOT NULL,
  "receipt_image_url" text,
  "created_by" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_cash_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "cash_code" text NOT NULL UNIQUE,
  "date" timestamp NOT NULL,
  "shift_type" text NOT NULL,
  "collected_amount" numeric NOT NULL,
  "expenses_amount" numeric NOT NULL DEFAULT '0',
  "manual_adjustment" numeric NOT NULL DEFAULT '0',
  "net_amount" numeric NOT NULL,
  "handed_to_treasury_amount" numeric NOT NULL DEFAULT '0',
  "remaining_with_employee" numeric NOT NULL,
  "handover_status" text NOT NULL DEFAULT 'pending',
  "employee_id" integer,
  "created_by" integer NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_created_by_users_id_fk') THEN
    ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_supplier_id_suppliers_id_fk') THEN
    ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_created_by_users_id_fk') THEN
    ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_confirmed_by_users_id_fk') THEN
    ALTER TABLE "purchases" ADD CONSTRAINT "purchases_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_stock_applied_by_users_id_fk') THEN
    ALTER TABLE "purchases" ADD CONSTRAINT "purchases_stock_applied_by_users_id_fk" FOREIGN KEY ("stock_applied_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_purchase_id_purchases_id_fk') THEN
    ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_inventory_item_id_inventory_items_id_fk') THEN
    ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_expenses_created_by_users_id_fk') THEN
    ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_cash_records_employee_id_users_id_fk') THEN
    ALTER TABLE "daily_cash_records" ADD CONSTRAINT "daily_cash_records_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_cash_records_created_by_users_id_fk') THEN
    ALTER TABLE "daily_cash_records" ADD CONSTRAINT "daily_cash_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

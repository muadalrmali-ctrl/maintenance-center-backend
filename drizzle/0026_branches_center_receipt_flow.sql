create table if not exists "branches" (
  "id" serial primary key,
  "name" text not null,
  "code" text not null unique,
  "city" text not null,
  "address" text,
  "phone" text,
  "status" text not null default 'active',
  "notes" text,
  "created_at" timestamp default now(),
  "updated_at" timestamp default now()
);

alter table "users" add column if not exists "branch_id" integer references "branches"("id");

alter table "cases" add column if not exists "source_type" text not null default 'main_center';
alter table "cases" add column if not exists "branch_id" integer references "branches"("id");
alter table "cases" add column if not exists "branch_created_by" integer references "users"("id");
alter table "cases" add column if not exists "branch_notes" text;
alter table "cases" add column if not exists "center_received_at" timestamp;
alter table "cases" add column if not exists "center_received_by" integer references "users"("id");
alter table "cases" add column if not exists "center_receipt_notes" text;

update "cases"
set "source_type" = coalesce("source_type", 'main_center')
where "source_type" is null;

alter table "staff_invitations"
add column if not exists "branch_id" integer references "branches"("id");

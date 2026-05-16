update users
set role = 'receptionist'
where role = 'branch_user';

update staff_invitations
set role = 'receptionist'
where role = 'branch_user';

delete from user_permissions
where permission_id in (
  select id
  from permissions
  where key in (
    'branches.view',
    'branches.manage',
    'branches.statistics.view',
    'cases.column.awaiting_center_receipt.view',
    'cases.awaiting_center_receipt.receive',
    'accounting.purchases.view',
    'accounting.purchases.manage',
    'accounting.expenses.view',
    'accounting.expenses.manage',
    'accounting.daily_cash.view',
    'accounting.daily_cash.manage'
  )
);

delete from permissions
where key in (
  'branches.view',
  'branches.manage',
  'branches.statistics.view',
  'cases.column.awaiting_center_receipt.view',
  'cases.awaiting_center_receipt.receive',
  'accounting.purchases.view',
  'accounting.purchases.manage',
  'accounting.expenses.view',
  'accounting.expenses.manage',
  'accounting.daily_cash.view',
  'accounting.daily_cash.manage'
);

alter table if exists staff_invitations
  drop column if exists branch_id;

alter table if exists cases
  drop column if exists source_type,
  drop column if exists branch_id,
  drop column if exists branch_created_by,
  drop column if exists branch_notes,
  drop column if exists center_received_at,
  drop column if exists center_received_by,
  drop column if exists center_receipt_notes;

alter table if exists users
  drop column if exists branch_id;

drop table if exists purchase_items;
drop table if exists purchases;
drop table if exists daily_expenses;
drop table if exists daily_cash_records;
drop table if exists branches;

alter table "users"
  add column if not exists "status" text not null default 'active';

update "users"
set "status" = 'active'
where "status" is null;

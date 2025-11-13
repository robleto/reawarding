-- (Renamed from 20251015T0415_add_admin_helpers.sql to remove time component per migration naming rules)
-- Create admin schema and last_updates() helper
create schema if not exists admin;

create or replace function admin.last_updates()
returns table (table_name text, last_update timestamptz, row_count bigint)
language plpgsql as $$
declare r record; dyn text := '';
begin
  for r in
    select table_schema, table_name
    from information_schema.columns
    where column_name = 'updated_at'
      and table_schema not in ('pg_catalog','information_schema')
  loop
    dyn := dyn || format(
      'select %L as table_name, max(updated_at) as last_update, count(*) as row_count from %I.%I union all ',
      r.table_schema||'.'||r.table_name, r.table_schema, r.table_name
    );
  end loop;

  if dyn = '' then
    return;
  end if;

  dyn := left(dyn, length(dyn)-10) || ' order by last_update nulls first';
  return query execute dyn;
end $$;

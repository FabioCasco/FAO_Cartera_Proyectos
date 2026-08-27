-- FAO Honduras GeoHub · operational authentication, protected writes and soft deletion.
-- Apply once in the Supabase SQL Editor for project xweafcknhbaxpnfeniiq.

begin;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.portfolio_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.portfolio_operators enable row level security;
revoke all on table private.portfolio_operators from public, anon, authenticated;

-- The project currently has administrator-created accounts only. Existing
-- permanent users become operators; public sign-up must remain disabled.
insert into private.portfolio_operators (user_id, email, active)
select id, coalesce(email, ''), true
from auth.users
where coalesce(is_anonymous, false) is false
on conflict (user_id) do update
set email = excluded.email,
    active = true,
    updated_at = now();

create or replace function private.is_portfolio_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from private.portfolio_operators operator_row
       where operator_row.user_id = (select auth.uid())
         and operator_row.active is true
     );
$$;

revoke all on function private.is_portfolio_operator() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_portfolio_operator() to authenticated;

alter table public.portfolio_projects
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists portfolio_projects_active_idx
  on public.portfolio_projects (updated_at desc)
  where deleted_at is null;

create index if not exists portfolio_projects_created_by_idx
  on public.portfolio_projects (created_by)
  where created_by is not null;

-- Remove every previous MVP policy before defining the operational model.
do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array[
    'portfolio_programmatic_areas',
    'portfolio_projects',
    'portfolio_project_programmatic_areas',
    'portfolio_staff_members',
    'portfolio_project_staff',
    'portfolio_organizations',
    'portfolio_project_organizations',
    'portfolio_project_components',
    'portfolio_results',
    'portfolio_indicators',
    'portfolio_indicator_measurements',
    'portfolio_project_locations',
    'portfolio_financial_snapshots',
    'portfolio_project_updates',
    'portfolio_risks',
    'portfolio_project_milestones',
    'portfolio_project_assets'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_row.policyname,
        table_name
      );
    end loop;
  end loop;
end $$;

-- Anonymous clients can load the public application shell but cannot read the
-- institutional portfolio. All database access requires an approved operator.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

-- Programmatic catalogue: read-only for operators.
create policy portfolio_programmatic_areas_operator_select
on public.portfolio_programmatic_areas
for select to authenticated
using ((select private.is_portfolio_operator()));

grant select on public.portfolio_programmatic_areas to authenticated;

-- Projects: inserts and updates are allowed only to approved operators. A
-- project is never physically deleted by the web app; deleted_at is used for
-- audit-safe removal from the portfolio.
create policy portfolio_projects_operator_select
on public.portfolio_projects
for select to authenticated
using (
  (select private.is_portfolio_operator())
  and deleted_at is null
);

create policy portfolio_projects_operator_insert
on public.portfolio_projects
for insert to authenticated
with check (
  (select private.is_portfolio_operator())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and is_demo is false
  and deleted_at is null
);

create policy portfolio_projects_operator_update
on public.portfolio_projects
for update to authenticated
using (
  (select private.is_portfolio_operator())
  and deleted_at is null
)
with check (
  (select private.is_portfolio_operator())
  and updated_by = (select auth.uid())
);

grant select, insert, update on public.portfolio_projects to authenticated;
revoke delete on public.portfolio_projects from authenticated;

-- Project-linked entities share the same active-project rule.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'portfolio_project_programmatic_areas',
    'portfolio_project_staff',
    'portfolio_project_organizations',
    'portfolio_project_components',
    'portfolio_results',
    'portfolio_indicators',
    'portfolio_project_locations',
    'portfolio_financial_snapshots',
    'portfolio_project_updates',
    'portfolio_risks',
    'portfolio_project_milestones',
    'portfolio_project_assets'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_portfolio_operator()) and exists (select 1 from public.portfolio_projects project_row where project_row.id = project_id and project_row.deleted_at is null))',
      table_name || '_operator_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_portfolio_operator()) and exists (select 1 from public.portfolio_projects project_row where project_row.id = project_id and project_row.deleted_at is null))',
      table_name || '_operator_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_portfolio_operator()) and exists (select 1 from public.portfolio_projects project_row where project_row.id = project_id and project_row.deleted_at is null)) with check ((select private.is_portfolio_operator()) and exists (select 1 from public.portfolio_projects project_row where project_row.id = project_id and project_row.deleted_at is null))',
      table_name || '_operator_update',
      table_name
    );
    execute format(
      'grant select, insert, update on public.%I to authenticated',
      table_name
    );
    execute format(
      'revoke delete on public.%I from authenticated',
      table_name
    );
  end loop;
end $$;

-- Indicator measurements are linked through the indicator rather than directly
-- through project_id.
create policy portfolio_indicator_measurements_operator_select
on public.portfolio_indicator_measurements
for select to authenticated
using (
  (select private.is_portfolio_operator())
  and exists (
    select 1
    from public.portfolio_indicators indicator_row
    join public.portfolio_projects project_row
      on project_row.id = indicator_row.project_id
    where indicator_row.id = indicator_id
      and project_row.deleted_at is null
  )
);

create policy portfolio_indicator_measurements_operator_insert
on public.portfolio_indicator_measurements
for insert to authenticated
with check (
  (select private.is_portfolio_operator())
  and exists (
    select 1
    from public.portfolio_indicators indicator_row
    join public.portfolio_projects project_row
      on project_row.id = indicator_row.project_id
    where indicator_row.id = indicator_id
      and project_row.deleted_at is null
  )
);

create policy portfolio_indicator_measurements_operator_update
on public.portfolio_indicator_measurements
for update to authenticated
using ((select private.is_portfolio_operator()))
with check ((select private.is_portfolio_operator()));

grant select, insert, update on public.portfolio_indicator_measurements to authenticated;
revoke delete on public.portfolio_indicator_measurements from authenticated;

-- Shared catalogues used while building project bundles.
create policy portfolio_staff_members_operator_all_read
on public.portfolio_staff_members
for select to authenticated
using ((select private.is_portfolio_operator()));

create policy portfolio_staff_members_operator_insert
on public.portfolio_staff_members
for insert to authenticated
with check ((select private.is_portfolio_operator()));

create policy portfolio_staff_members_operator_update
on public.portfolio_staff_members
for update to authenticated
using ((select private.is_portfolio_operator()))
with check ((select private.is_portfolio_operator()));

create policy portfolio_organizations_operator_all_read
on public.portfolio_organizations
for select to authenticated
using ((select private.is_portfolio_operator()));

create policy portfolio_organizations_operator_insert
on public.portfolio_organizations
for insert to authenticated
with check ((select private.is_portfolio_operator()));

create policy portfolio_organizations_operator_update
on public.portfolio_organizations
for update to authenticated
using ((select private.is_portfolio_operator()))
with check ((select private.is_portfolio_operator()));

grant select, insert, update on public.portfolio_staff_members to authenticated;
grant select, insert, update on public.portfolio_organizations to authenticated;
revoke delete on public.portfolio_staff_members from authenticated;
revoke delete on public.portfolio_organizations from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Views retain their current definitions and become protected automatically
-- because every view is security_invoker and the underlying RLS now hides
-- deleted projects and blocks anonymous access.
alter view public.portfolio_latest_financial set (security_invoker = true);
alter view public.portfolio_latest_update set (security_invoker = true);
alter view public.portfolio_project_staff_v set (security_invoker = true);
alter view public.portfolio_project_locations_v set (security_invoker = true);
alter view public.portfolio_project_summary set (security_invoker = true);
alter view public.portfolio_area_summary set (security_invoker = true);
alter view public.portfolio_monthly_execution set (security_invoker = true);

revoke all on public.portfolio_latest_financial from anon;
revoke all on public.portfolio_latest_update from anon;
revoke all on public.portfolio_project_staff_v from anon;
revoke all on public.portfolio_project_locations_v from anon;
revoke all on public.portfolio_project_summary from anon;
revoke all on public.portfolio_area_summary from anon;
revoke all on public.portfolio_monthly_execution from anon;

grant select on public.portfolio_latest_financial to authenticated;
grant select on public.portfolio_latest_update to authenticated;
grant select on public.portfolio_project_staff_v to authenticated;
grant select on public.portfolio_project_locations_v to authenticated;
grant select on public.portfolio_project_summary to authenticated;
grant select on public.portfolio_area_summary to authenticated;
grant select on public.portfolio_monthly_execution to authenticated;

create or replace function public.portfolio_create_project_bundle(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_project_id uuid;
  v_result_id uuid;
  v_staff_id uuid;
  area jsonb;
  component jsonb;
  result_row jsonb;
  indicator_row jsonb;
  location_row jsonb;
  staff_row jsonb;
begin
  if not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para administrar la cartera.'
      using errcode = '42501';
  end if;

  if nullif(btrim(payload->'project'->>'code'), '') is null
     or nullif(btrim(payload->'project'->>'title'), '') is null then
    raise exception 'El código y el nombre del proyecto son obligatorios.';
  end if;

  insert into public.portfolio_projects (
    code, acronym, title, summary, country, donor, coordinator,
    start_date, end_date, currency, budget_total, status, is_demo,
    created_by, updated_by
  ) values (
    btrim(payload->'project'->>'code'),
    coalesce(payload->'project'->>'acronym', ''),
    btrim(payload->'project'->>'title'),
    coalesce(payload->'project'->>'summary', ''),
    coalesce(payload->'project'->>'country', 'Honduras'),
    coalesce(payload->'project'->>'donor', ''),
    coalesce(payload->'project'->>'coordinator', ''),
    (payload->'project'->>'start_date')::date,
    (payload->'project'->>'end_date')::date,
    coalesce(payload->'project'->>'currency', 'USD'),
    coalesce((payload->'project'->>'budget_total')::numeric, 0),
    coalesce(
      (payload->'project'->>'status')::public.portfolio_project_status,
      'draft'
    ),
    false,
    (select auth.uid()),
    (select auth.uid())
  ) returning id into v_project_id;

  for area in
    select * from jsonb_array_elements(coalesce(payload->'areas', '[]'::jsonb))
  loop
    insert into public.portfolio_project_programmatic_areas (
      project_id, area_id, is_primary, contribution_pct
    ) values (
      v_project_id,
      (area->>'area_id')::smallint,
      coalesce((area->>'is_primary')::boolean, false),
      coalesce((area->>'contribution_pct')::numeric, 0)
    );
  end loop;

  for component in
    select * from jsonb_array_elements(coalesce(payload->'components', '[]'::jsonb))
  loop
    insert into public.portfolio_project_components (
      project_id, code, title, description, budget_allocated,
      progress_pct, sort_order
    ) values (
      v_project_id,
      component->>'code',
      component->>'title',
      coalesce(component->>'description', ''),
      coalesce((component->>'budget_allocated')::numeric, 0),
      coalesce((component->>'progress_pct')::numeric, 0),
      coalesce((component->>'sort_order')::int, 0)
    );
  end loop;

  for result_row in
    select * from jsonb_array_elements(coalesce(payload->'results', '[]'::jsonb))
  loop
    insert into public.portfolio_results (
      project_id, code, level, title, description, sort_order
    ) values (
      v_project_id,
      result_row->>'code',
      (result_row->>'level')::public.portfolio_result_level,
      result_row->>'title',
      coalesce(result_row->>'description', ''),
      coalesce((result_row->>'sort_order')::int, 0)
    ) returning id into v_result_id;

    for indicator_row in
      select * from jsonb_array_elements(
        coalesce(result_row->'indicators', '[]'::jsonb)
      )
    loop
      insert into public.portfolio_indicators (
        project_id, result_id, code, name, definition, unit,
        baseline_value, target_value, current_value, frequency, data_source
      ) values (
        v_project_id,
        v_result_id,
        indicator_row->>'code',
        indicator_row->>'name',
        coalesce(indicator_row->>'definition', ''),
        coalesce(indicator_row->>'unit', ''),
        nullif(indicator_row->>'baseline_value', '')::numeric,
        nullif(indicator_row->>'target_value', '')::numeric,
        nullif(indicator_row->>'current_value', '')::numeric,
        coalesce(indicator_row->>'frequency', 'quarterly'),
        coalesce(indicator_row->>'data_source', '')
      );
    end loop;
  end loop;

  for location_row in
    select * from jsonb_array_elements(coalesce(payload->'locations', '[]'::jsonb))
  loop
    insert into public.portfolio_project_locations (
      project_id, geometry_type, department, municipality, location_name,
      intervention_type, latitude, longitude, geom, notes
    ) values (
      v_project_id,
      coalesce(
        (location_row->>'geometry_type')::public.portfolio_location_geometry_type,
        'point'
      ),
      coalesce(location_row->>'department', ''),
      coalesce(location_row->>'municipality', ''),
      coalesce(location_row->>'location_name', ''),
      coalesce(location_row->>'intervention_type', ''),
      nullif(location_row->>'latitude', '')::double precision,
      nullif(location_row->>'longitude', '')::double precision,
      case
        when nullif(location_row->>'latitude', '') is not null
         and nullif(location_row->>'longitude', '') is not null
        then st_setsrid(
          st_makepoint(
            (location_row->>'longitude')::double precision,
            (location_row->>'latitude')::double precision
          ),
          4326
        )
        else null
      end,
      coalesce(location_row->>'notes', '')
    );
  end loop;

  for staff_row in
    select * from jsonb_array_elements(coalesce(payload->'staff', '[]'::jsonb))
  loop
    v_staff_id := null;

    if coalesce(staff_row->>'email', '') <> '' then
      select id into v_staff_id
      from public.portfolio_staff_members
      where lower(email) = lower(staff_row->>'email')
      limit 1;
    end if;

    if v_staff_id is null then
      insert into public.portfolio_staff_members (
        full_name, email, title, contract_type
      ) values (
        staff_row->>'full_name',
        coalesce(staff_row->>'email', ''),
        coalesce(staff_row->>'title', ''),
        coalesce(staff_row->>'contract_type', '')
      ) returning id into v_staff_id;
    end if;

    insert into public.portfolio_project_staff (
      project_id, staff_id, role_title, allocation_pct
    ) values (
      v_project_id,
      v_staff_id,
      coalesce(staff_row->>'role_title', ''),
      coalesce((staff_row->>'allocation_pct')::numeric, 100)
    );
  end loop;

  if payload ? 'financial' then
    insert into public.portfolio_financial_snapshots (
      project_id, snapshot_date, budget_amount, planned_execution_amount,
      expenditure_amount, commitments_amount, notes
    ) values (
      v_project_id,
      (payload->'financial'->>'snapshot_date')::date,
      coalesce((payload->'financial'->>'budget_amount')::numeric, 0),
      coalesce((payload->'financial'->>'planned_execution_amount')::numeric, 0),
      coalesce((payload->'financial'->>'expenditure_amount')::numeric, 0),
      coalesce((payload->'financial'->>'commitments_amount')::numeric, 0),
      coalesce(payload->'financial'->>'notes', '')
    );
  end if;

  if payload ? 'update' then
    insert into public.portfolio_project_updates (
      project_id, report_date, physical_progress_pct, summary,
      achievements, bottlenecks, next_steps
    ) values (
      v_project_id,
      (payload->'update'->>'report_date')::date,
      coalesce((payload->'update'->>'physical_progress_pct')::numeric, 0),
      coalesce(payload->'update'->>'summary', ''),
      coalesce(payload->'update'->>'achievements', ''),
      coalesce(payload->'update'->>'bottlenecks', ''),
      coalesce(payload->'update'->>'next_steps', '')
    );
  end if;

  return v_project_id;
end;
$$;

create or replace function public.portfolio_record_project_update(
  target_project_id uuid,
  payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para actualizar la cartera.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.portfolio_projects
    where id = target_project_id
      and deleted_at is null
  ) then
    raise exception 'El proyecto no está disponible.';
  end if;

  insert into public.portfolio_financial_snapshots (
    project_id, snapshot_date, budget_amount, planned_execution_amount,
    expenditure_amount, commitments_amount, notes
  ) values (
    target_project_id,
    (payload->>'snapshot_date')::date,
    coalesce((payload->>'budget_amount')::numeric, 0),
    coalesce((payload->>'planned_execution_amount')::numeric, 0),
    coalesce((payload->>'expenditure_amount')::numeric, 0),
    coalesce((payload->>'commitments_amount')::numeric, 0),
    coalesce(payload->>'notes', '')
  )
  on conflict (project_id, snapshot_date) do update set
    budget_amount = excluded.budget_amount,
    planned_execution_amount = excluded.planned_execution_amount,
    expenditure_amount = excluded.expenditure_amount,
    commitments_amount = excluded.commitments_amount,
    notes = excluded.notes;

  insert into public.portfolio_project_updates (
    project_id, report_date, physical_progress_pct, summary,
    achievements, bottlenecks, next_steps
  ) values (
    target_project_id,
    coalesce(
      (payload->>'report_date')::date,
      (payload->>'snapshot_date')::date
    ),
    coalesce((payload->>'physical_progress_pct')::numeric, 0),
    coalesce(payload->>'summary', ''),
    coalesce(payload->>'achievements', ''),
    coalesce(payload->>'bottlenecks', ''),
    coalesce(payload->>'next_steps', '')
  )
  on conflict (project_id, report_date) do update set
    physical_progress_pct = excluded.physical_progress_pct,
    summary = excluded.summary,
    achievements = excluded.achievements,
    bottlenecks = excluded.bottlenecks,
    next_steps = excluded.next_steps;

  update public.portfolio_projects
  set status = case
        when payload ? 'status'
        then (payload->>'status')::public.portfolio_project_status
        else status
      end,
      updated_at = now(),
      updated_by = (select auth.uid())
  where id = target_project_id;
end;
$$;

create or replace function public.portfolio_delete_project(
  target_project_id uuid,
  confirmation_code text
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  project_code text;
  project_acronym text;
  project_is_demo boolean;
begin
  if not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para eliminar proyectos.'
      using errcode = '42501';
  end if;

  select code, acronym, is_demo
    into project_code, project_acronym, project_is_demo
  from public.portfolio_projects
  where id = target_project_id
    and deleted_at is null;

  if not found then
    raise exception 'El proyecto no existe o ya fue eliminado.';
  end if;

  if project_is_demo then
    raise exception 'Los proyectos DEMO están protegidos y no pueden eliminarse.';
  end if;

  if lower(btrim(coalesce(confirmation_code, ''))) <> lower(btrim(project_code))
     and (
       nullif(btrim(coalesce(project_acronym, '')), '') is null
       or lower(btrim(coalesce(confirmation_code, ''))) <>
          lower(btrim(project_acronym))
     ) then
    raise exception 'El código de confirmación no coincide con el proyecto.';
  end if;

  update public.portfolio_projects
  set deleted_at = now(),
      deleted_by = (select auth.uid()),
      updated_at = now(),
      updated_by = (select auth.uid())
  where id = target_project_id;
end;
$$;

revoke all on function public.portfolio_create_project_bundle(jsonb)
  from public, anon;
revoke all on function public.portfolio_record_project_update(uuid, jsonb)
  from public, anon;
revoke all on function public.portfolio_delete_project(uuid, text)
  from public, anon;

grant execute on function public.portfolio_create_project_bundle(jsonb)
  to authenticated;
grant execute on function public.portfolio_record_project_update(uuid, jsonb)
  to authenticated;
grant execute on function public.portfolio_delete_project(uuid, text)
  to authenticated;

-- Private, authenticated evidence storage.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'portfolio-assets',
  'portfolio-assets',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/geo+json',
    'application/zip'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname ilike '%portfolio%'
        or coalesce(qual, '') ilike '%portfolio-assets%'
        or coalesce(with_check, '') ilike '%portfolio-assets%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_row.policyname
    );
  end loop;
end $$;

create policy portfolio_assets_operator_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (select private.is_portfolio_operator())
);

create policy portfolio_assets_operator_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portfolio-assets'
  and (select private.is_portfolio_operator())
  and owner_id = (select auth.uid()::text)
);

create policy portfolio_assets_operator_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (select private.is_portfolio_operator())
)
with check (
  bucket_id = 'portfolio-assets'
  and (select private.is_portfolio_operator())
);

create policy portfolio_assets_operator_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (select private.is_portfolio_operator())
);

commit;

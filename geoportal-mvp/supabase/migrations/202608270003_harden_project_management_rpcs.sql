-- FAO-HN GeoHub · harden project editing and soft deletion under RLS.

create or replace function public.portfolio_update_project_core(
  target_project_id uuid,
  payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  current_project public.portfolio_projects%rowtype;
  next_start_date date;
  next_end_date date;
  next_area_id smallint;
begin
  if not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para editar proyectos.'
      using errcode = '42501';
  end if;

  select *
  into current_project
  from public.portfolio_projects
  where id = target_project_id
    and deleted_at is null;

  if not found then
    raise exception 'El proyecto no existe o fue retirado de la cartera.';
  end if;

  if payload ? 'code'
     and nullif(btrim(payload->>'code'), '') is null then
    raise exception 'El código del proyecto es obligatorio.';
  end if;

  if payload ? 'title'
     and nullif(btrim(payload->>'title'), '') is null then
    raise exception 'El nombre del proyecto es obligatorio.';
  end if;

  next_start_date := case
    when payload ? 'start_date' then nullif(payload->>'start_date', '')::date
    else current_project.start_date
  end;

  next_end_date := case
    when payload ? 'end_date' then nullif(payload->>'end_date', '')::date
    else current_project.end_date
  end;

  if next_start_date is null or next_end_date is null then
    raise exception 'Las fechas de inicio y cierre son obligatorias.';
  end if;

  if next_end_date < next_start_date then
    raise exception 'La fecha de cierre no puede ser anterior a la fecha de inicio.';
  end if;

  update public.portfolio_projects
  set code = case
        when payload ? 'code' then btrim(payload->>'code')
        else code
      end,
      acronym = case
        when payload ? 'acronym' then coalesce(payload->>'acronym', '')
        else acronym
      end,
      title = case
        when payload ? 'title' then btrim(payload->>'title')
        else title
      end,
      summary = case
        when payload ? 'summary' then coalesce(payload->>'summary', '')
        else summary
      end,
      donor = case
        when payload ? 'donor' then coalesce(payload->>'donor', '')
        else donor
      end,
      coordinator = case
        when payload ? 'coordinator' then coalesce(payload->>'coordinator', '')
        else coordinator
      end,
      start_date = next_start_date,
      end_date = next_end_date,
      currency = case
        when payload ? 'currency' then coalesce(nullif(payload->>'currency', ''), currency)
        else currency
      end,
      budget_total = case
        when payload ? 'budget_total' then greatest(coalesce((payload->>'budget_total')::numeric, 0), 0)
        else budget_total
      end,
      status = case
        when payload ? 'status' then (payload->>'status')::public.portfolio_project_status
        else status
      end,
      updated_at = now(),
      updated_by = (select auth.uid())
  where id = target_project_id;

  if payload ? 'primary_area_id' then
    next_area_id := (payload->>'primary_area_id')::smallint;

    if not exists (
      select 1
      from public.portfolio_programmatic_areas
      where id = next_area_id
    ) then
      raise exception 'El área programática seleccionada no existe.';
    end if;

    update public.portfolio_project_programmatic_areas
    set is_primary = false
    where project_id = target_project_id;

    insert into public.portfolio_project_programmatic_areas (
      project_id,
      area_id,
      is_primary,
      contribution_pct
    ) values (
      target_project_id,
      next_area_id,
      true,
      100
    )
    on conflict (project_id, area_id)
    do update
      set is_primary = true;
  end if;
end;
$$;

revoke all on function public.portfolio_update_project_core(uuid, jsonb)
from public, anon;
grant execute on function public.portfolio_update_project_core(uuid, jsonb)
to authenticated;

create or replace function private.soft_delete_portfolio_project(
  target_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para eliminar proyectos.'
      using errcode = '42501';
  end if;

  update public.portfolio_projects
  set deleted_at = now(),
      deleted_by = (select auth.uid()),
      updated_at = now(),
      updated_by = (select auth.uid())
  where id = target_project_id
    and deleted_at is null;

  if not found then
    raise exception 'El proyecto no existe o ya fue eliminado.';
  end if;
end;
$$;

revoke all on function private.soft_delete_portfolio_project(uuid)
from public;
grant execute on function private.soft_delete_portfolio_project(uuid)
to authenticated;

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
begin
  if not private.is_portfolio_operator() then
    raise exception 'La cuenta no está autorizada para eliminar proyectos.'
      using errcode = '42501';
  end if;

  select code, acronym
    into project_code, project_acronym
  from public.portfolio_projects
  where id = target_project_id
    and deleted_at is null;

  if not found then
    raise exception 'El proyecto no existe o ya fue eliminado.';
  end if;

  if lower(btrim(coalesce(confirmation_code, ''))) <> lower(btrim(project_code))
     and (
       nullif(btrim(coalesce(project_acronym, '')), '') is null
       or lower(btrim(coalesce(confirmation_code, ''))) <>
          lower(btrim(project_acronym))
     ) then
    raise exception 'El código de confirmación no coincide con el proyecto.';
  end if;

  perform private.soft_delete_portfolio_project(target_project_id);
end;
$$;

revoke all on function public.portfolio_delete_project(uuid, text)
from public, anon;
grant execute on function public.portfolio_delete_project(uuid, text)
to authenticated;

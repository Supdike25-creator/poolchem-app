-- Allow service-role / admin API pool inserts (auth.uid() is null).
-- Without this, Dev Admin "Add pool" fails because the pools trigger
-- expects a logged-in profile and raises "Current user is not assigned to a company".

create or replace function public.set_pool_company_from_current_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_company_id uuid;
  current_role text;
begin
  if auth.uid() is null then
    if new.company_id is null then
      raise exception 'Pool inserts require company_id when no auth session is present';
    end if;
    return new;
  end if;

  select company_id, lower(role)
  into current_company_id, current_role
  from public.profiles
  where id = auth.uid();

  if current_role = 'dev' then
    if new.company_id is null then
      raise exception 'Dev-created pools must include company_id';
    end if;
    return new;
  end if;

  if current_company_id is null then
    raise exception 'Current user is not assigned to a company';
  end if;

  if new.company_id is null then
    new.company_id := current_company_id;
  end if;

  if new.company_id <> current_company_id then
    raise exception 'Pools can only be assigned to your company';
  end if;

  return new;
end;
$$;

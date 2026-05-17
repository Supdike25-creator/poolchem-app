alter table public.chemical_logs
add column if not exists submitted_by uuid references auth.users(id),
add column if not exists dosing_amount numeric,
add column if not exists dosing_unit text,
add column if not exists dosing_chemical text,
add column if not exists dosing_recommendation text;

create index if not exists chemical_logs_submitted_by_idx
on public.chemical_logs(submitted_by);

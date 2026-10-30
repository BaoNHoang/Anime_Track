-- Run once in the Supabase SQL Editor before enabling 100-point scores.
-- Existing scores retain their values; no rows are rescaled.
alter table public.profiles
  add column if not exists score_scale smallint not null default 10;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_score_scale_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_score_scale_check
      check (score_scale in (10, 100));
  end if;
end
$$;

alter table public.tracked_anime
  alter column user_score type numeric(4, 2);

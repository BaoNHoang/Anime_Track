create extension if not exists pg_trgm;

create table if not exists public.tracked_anime (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  item jsonb not null,
  tracking_status text not null default 'plan_to_watch',
  anime_title text not null default '',
  anime_type text not null default '',
  user_score numeric(3, 1),
  progress integer not null default 0,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, anime_id),
  constraint tracked_anime_status_check check (
    tracking_status in (
      'watching',
      'completed',
      'on_hold',
      'dropped',
      'plan_to_watch'
    )
  ),
  constraint tracked_anime_progress_check check (progress >= 0),
  constraint tracked_anime_score_check check (
    user_score is null or (user_score >= 0 and user_score <= 10)
  ),
  constraint tracked_anime_item_object_check check (
    jsonb_typeof(item) = 'object'
  ),
  constraint tracked_anime_item_size_check check (
    octet_length(item::text) <= 100000
  ),
  constraint tracked_anime_title_length_check check (
    char_length(anime_title) <= 500
  ),
  constraint tracked_anime_type_length_check check (
    char_length(anime_type) <= 100
  )
);

alter table public.tracked_anime
  add column if not exists tracking_status text,
  add column if not exists anime_title text,
  add column if not exists anime_type text,
  add column if not exists user_score numeric(3, 1),
  add column if not exists progress integer,
  add column if not exists added_at timestamptz;

update public.tracked_anime
set
  tracking_status = coalesce(
    tracking_status,
    item ->> 'status',
    'plan_to_watch'
  ),
  anime_title = coalesce(
    anime_title,
    nullif(item #>> '{anime,titleEnglish}', ''),
    item #>> '{anime,title}',
    ''
  ),
  anime_type = coalesce(anime_type, item #>> '{anime,type}', ''),
  user_score = coalesce(user_score, (item ->> 'userScore')::numeric),
  progress = coalesce(progress, (item ->> 'progress')::integer, 0),
  added_at = coalesce(
    added_at,
    (item ->> 'addedAt')::timestamptz,
    updated_at
  )
where
  tracking_status is null
  or anime_title is null
  or anime_type is null
  or progress is null
  or added_at is null;

alter table public.tracked_anime
  alter column tracking_status set default 'plan_to_watch',
  alter column tracking_status set not null,
  alter column anime_title set default '',
  alter column anime_title set not null,
  alter column anime_type set default '',
  alter column anime_type set not null,
  alter column progress set default 0,
  alter column progress set not null,
  alter column added_at set default now(),
  alter column added_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_status_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_status_check check (
        tracking_status in (
          'watching',
          'completed',
          'on_hold',
          'dropped',
          'plan_to_watch'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_progress_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_progress_check check (progress >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_score_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_score_check check (
        user_score is null or (user_score >= 0 and user_score <= 10)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_item_object_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_item_object_check check (
        jsonb_typeof(item) = 'object'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_item_size_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_item_size_check check (
        octet_length(item::text) <= 100000
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_title_length_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_title_length_check check (
        char_length(anime_title) <= 500
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracked_anime_type_length_check'
      and conrelid = 'public.tracked_anime'::regclass
  ) then
    alter table public.tracked_anime
      add constraint tracked_anime_type_length_check check (
        char_length(anime_type) <= 100
      );
  end if;
end
$$;

create index if not exists tracked_anime_user_id_idx
  on public.tracked_anime (user_id);

create index if not exists tracked_anime_user_status_updated_idx
  on public.tracked_anime (user_id, tracking_status, updated_at desc);

create index if not exists tracked_anime_user_updated_idx
  on public.tracked_anime (user_id, updated_at desc);

create index if not exists tracked_anime_user_added_idx
  on public.tracked_anime (user_id, added_at desc);

create index if not exists tracked_anime_user_type_idx
  on public.tracked_anime (user_id, anime_type);

create index if not exists tracked_anime_user_score_idx
  on public.tracked_anime (user_id, user_score desc)
  where user_score is not null;

create index if not exists tracked_anime_title_search_idx
  on public.tracked_anime
  using gin (lower(anime_title) gin_trgm_ops);

create index if not exists tracked_anime_title_ilike_idx
  on public.tracked_anime
  using gin (anime_title gin_trgm_ops);

alter table public.tracked_anime enable row level security;

drop policy if exists "Users can read their own tracked anime"
  on public.tracked_anime;
create policy "Users can read their own tracked anime"
  on public.tracked_anime
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own tracked anime"
  on public.tracked_anime;
create policy "Users can insert their own tracked anime"
  on public.tracked_anime
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tracked anime"
  on public.tracked_anime;
create policy "Users can update their own tracked anime"
  on public.tracked_anime
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tracked anime"
  on public.tracked_anime;
create policy "Users can delete their own tracked anime"
  on public.tracked_anime
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

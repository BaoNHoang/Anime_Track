create schema if not exists extensions;

create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension extension_record
    join pg_namespace extension_schema
      on extension_schema.oid = extension_record.extnamespace
    where extension_record.extname = 'pg_trgm'
      and extension_schema.nspname <> 'extensions'
  ) then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_id text not null default 'male-01',
  avatar_path text,
  banner_id text not null default 'banner-01',
  banner_path text,
  score_step numeric(2, 1) not null default 0.5,
  favorites jsonb not null default '{"anime":[],"studios":[],"directors":[],"characters":[]}'::jsonb,
  username_normalized text generated always as (lower(username)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (
    username ~ '^[A-Za-z0-9_]{3,24}$'
  ),
  constraint profiles_username_normalized_unique unique (username_normalized),
  constraint profiles_avatar_id_check check (
    avatar_id in (
      'male-01', 'male-02', 'male-03', 'male-04', 'male-05',
      'female-01', 'female-02', 'female-03', 'female-04', 'female-05'
    )
    ),
  constraint profiles_score_step_check check (score_step in (0.5, 1.0)),
  constraint profiles_favorites_check check (
    jsonb_typeof(favorites) = 'object' and octet_length(favorites::text) <= 30000
  ),
  constraint profiles_banner_id_check check (
    banner_id in ('banner-01', 'banner-02', 'banner-03', 'banner-04', 'banner-05')
  ),
  constraint profiles_avatar_path_check check (
    avatar_path is null or avatar_path = user_id::text || '/avatar.webp'
  ),
  constraint profiles_banner_path_check check (
    banner_path is null or banner_path = user_id::text || '/banner.webp'
  )
);

alter table public.profiles
  add column if not exists avatar_id text not null default 'male-01',
  add column if not exists avatar_path text,
  add column if not exists banner_id text not null default 'banner-01',
  add column if not exists banner_path text,
  add column if not exists score_step numeric(2, 1) not null default 0.5,
  add column if not exists favorites jsonb not null default '{"anime":[],"studios":[],"directors":[],"characters":[]}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_id_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_id_check check (
      avatar_id in (
        'male-01', 'male-02', 'male-03', 'male-04', 'male-05',
        'female-01', 'female-02', 'female-03', 'female-04', 'female-05'
      )
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_favorites_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_favorites_check check (
      jsonb_typeof(favorites) = 'object' and octet_length(favorites::text) <= 30000
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_score_step_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_score_step_check
      check (score_step in (0.5, 1.0));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_banner_id_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_banner_id_check check (
      banner_id in ('banner-01', 'banner-02', 'banner-03', 'banner-04', 'banner-05')
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_path_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_path_check check (
      avatar_path is null or avatar_path = user_id::text || '/avatar.webp'
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_banner_path_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_banner_path_check check (
      banner_path is null or banner_path = user_id::text || '/banner.webp'
    );
  end if;
end
$$;

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users can read their own profile"
  on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile"
  on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-media',
  'profile-media',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp'];

drop policy if exists "Users can read their own profile media"
  on storage.objects;
create policy "Users can read their own profile media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-media'
    and name in (
      (select auth.uid())::text || '/avatar.webp',
      (select auth.uid())::text || '/banner.webp'
    )
  );

drop policy if exists "Users can insert their own profile media"
  on storage.objects;
create policy "Users can insert their own profile media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and name in (
      (select auth.uid())::text || '/avatar.webp',
      (select auth.uid())::text || '/banner.webp'
    )
  );

drop policy if exists "Users can update their own profile media"
  on storage.objects;
create policy "Users can update their own profile media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and name in (
      (select auth.uid())::text || '/avatar.webp',
      (select auth.uid())::text || '/banner.webp'
    )
  )
  with check (
    bucket_id = 'profile-media'
    and name in (
      (select auth.uid())::text || '/avatar.webp',
      (select auth.uid())::text || '/banner.webp'
    )
  );

drop policy if exists "Users can delete their own profile media"
  on storage.objects;
create policy "Users can delete their own profile media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and name in (
      (select auth.uid())::text || '/avatar.webp',
      (select auth.uid())::text || '/banner.webp'
    )
  );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  requested_username := trim(new.raw_user_meta_data ->> 'username');
  if requested_username is null
    or requested_username !~ '^[A-Za-z0-9_]{3,24}$'
  then
    requested_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, requested_username)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

insert into public.profiles (user_id, username)
select
  id,
  'user_' || left(replace(id::text, '-', ''), 12)
from auth.users
where email_confirmed_at is not null
on conflict (user_id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute procedure public.handle_new_auth_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (
    old.email_confirmed_at is null
    and new.email_confirmed_at is not null
  )
  execute procedure public.handle_new_auth_user();

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
  using gin (lower(anime_title) extensions.gin_trgm_ops);

create index if not exists tracked_anime_title_ilike_idx
  on public.tracked_anime
  using gin (anime_title extensions.gin_trgm_ops);

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

create table if not exists public.release_notifications (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  notification_id text not null,
  title text not null,
  image_url text not null default '',
  released_at timestamptz not null,
  tracking_status text not null,
  notification_type text not null default 'episode',
  episode_number integer,
  source_anime_id integer,
  source_title text,
  premiere_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_id),
  constraint release_notifications_anime_id_check check (
    anime_id > 0 and anime_id <= 10000000
  ),
  constraint release_notifications_id_length_check check (
    char_length(notification_id) between 1 and 80
  ),
  constraint release_notifications_title_length_check check (
    char_length(title) between 1 and 500
  ),
  constraint release_notifications_image_length_check check (
    char_length(image_url) <= 2048
  ),
  constraint release_notifications_status_check check (
    tracking_status in ('watching', 'plan_to_watch', 'completed', 'on_hold')
  ),
  constraint release_notifications_type_check check (
    notification_type in ('episode', 'season')
  ),
  constraint release_notifications_episode_check check (
    episode_number is null or (episode_number > 0 and episode_number <= 100000)
  ),
  constraint release_notifications_source_anime_check check (
    source_anime_id is null or (source_anime_id > 0 and source_anime_id <= 10000000)
  ),
  constraint release_notifications_source_title_length_check check (
    source_title is null or char_length(source_title) <= 500
  )
);

alter table public.release_notifications
  add column if not exists notification_type text not null default 'episode',
  add column if not exists episode_number integer,
  add column if not exists source_anime_id integer,
  add column if not exists source_title text,
  add column if not exists premiere_at timestamptz;

alter table public.release_notifications
  drop constraint if exists release_notifications_pkey,
  add constraint release_notifications_pkey
    primary key (user_id, notification_id),
  drop constraint if exists release_notifications_status_check,
  add constraint release_notifications_status_check check (
    tracking_status in ('watching', 'plan_to_watch', 'completed', 'on_hold')
  ),
  drop constraint if exists release_notifications_type_check,
  add constraint release_notifications_type_check check (
    notification_type in ('episode', 'season')
  ),
  drop constraint if exists release_notifications_episode_check,
  add constraint release_notifications_episode_check check (
    episode_number is null or (episode_number > 0 and episode_number <= 100000)
  ),
  drop constraint if exists release_notifications_source_anime_check,
  add constraint release_notifications_source_anime_check check (
    source_anime_id is null or (source_anime_id > 0 and source_anime_id <= 10000000)
  ),
  drop constraint if exists release_notifications_source_title_length_check,
  add constraint release_notifications_source_title_length_check check (
    source_title is null or char_length(source_title) <= 500
  );

create index if not exists release_notifications_user_released_idx
  on public.release_notifications (user_id, released_at desc);

alter table public.release_notifications enable row level security;

revoke all on public.release_notifications from anon, authenticated;
grant select, insert, update, delete on public.release_notifications
  to authenticated;

drop policy if exists "Users can read their own release notifications"
  on public.release_notifications;
create policy "Users can read their own release notifications"
  on public.release_notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own release notifications"
  on public.release_notifications;
create policy "Users can insert their own release notifications"
  on public.release_notifications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own release notifications"
  on public.release_notifications;
create policy "Users can update their own release notifications"
  on public.release_notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own release notifications"
  on public.release_notifications;
create policy "Users can delete their own release notifications"
  on public.release_notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.release_notification_cursors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_checked_at timestamptz not null,
  seen_season_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.release_notification_cursors
  add column if not exists seen_season_ids jsonb not null default '[]'::jsonb;

alter table public.release_notification_cursors
  drop constraint if exists release_notification_cursors_seen_seasons_check,
  add constraint release_notification_cursors_seen_seasons_check check (
    jsonb_typeof(seen_season_ids) = 'array'
  );

alter table public.release_notification_cursors enable row level security;

revoke all on public.release_notification_cursors from anon, authenticated;
grant select, insert, update on public.release_notification_cursors
  to authenticated;

drop policy if exists "Users can read their own release cursor"
  on public.release_notification_cursors;
create policy "Users can read their own release cursor"
  on public.release_notification_cursors
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own release cursor"
  on public.release_notification_cursors;
create policy "Users can insert their own release cursor"
  on public.release_notification_cursors
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own release cursor"
  on public.release_notification_cursors;
create policy "Users can update their own release cursor"
  on public.release_notification_cursors
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
      and cmd.schema_name in ('public')
      and cmd.schema_name not in ('pg_catalog', 'information_schema')
      and cmd.schema_name not like 'pg_toast%'
      and cmd.schema_name not like 'pg_temp%'
    then
      begin
        execute format(
          'alter table if exists %s enable row level security',
          cmd.object_identity
        );
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log
        'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity,
        cmd.schema_name;
    end if;
  end loop;
end;
$$;

revoke all privileges
  on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();

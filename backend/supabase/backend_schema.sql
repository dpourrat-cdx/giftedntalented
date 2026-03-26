create extension if not exists pgcrypto with schema extensions;

create table if not exists public.test_scores (
  id uuid primary key default extensions.gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 1 and 40),
  score integer not null check (score >= 0),
  percentage integer not null check (percentage between 0 and 100),
  total_questions integer not null check (total_questions > 0),
  elapsed_seconds integer check (elapsed_seconds is null or elapsed_seconds >= 0),
  completed_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists test_scores_player_name_unique
on public.test_scores ((lower(btrim(player_name))));

create table if not exists public.app_admin_settings (
  id boolean primary key default true,
  reset_pin_hash text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  check (id = true)
);

create table if not exists public.notification_devices (
  id uuid primary key default extensions.gen_random_uuid(),
  device_token text not null unique,
  platform text not null check (platform in ('android', 'web')),
  client_type text not null check (client_type in ('android', 'web')),
  player_name text check (player_name is null or char_length(trim(player_name)) between 1 and 40),
  app_version text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.score_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 1 and 40),
  client_type text not null check (client_type in ('android', 'web')),
  mode text not null check (mode in ('quiz', 'story')),
  total_questions integer not null check (total_questions > 0),
  question_key jsonb not null check (jsonb_typeof(question_key) = 'array'),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '2 hours'),
  selection_fingerprint text,
  score_saved_at timestamptz,
  score_saved_score integer check (score_saved_score is null or score_saved_score >= 0),
  score_saved_percentage integer check (score_saved_percentage is null or (score_saved_percentage between 0 and 100)),
  score_saved_elapsed_seconds integer check (score_saved_elapsed_seconds is null or score_saved_elapsed_seconds >= 0),
  score_saved_payload jsonb,
  last_elapsed_seconds integer check (last_elapsed_seconds is null or last_elapsed_seconds >= 0)
);

create index if not exists score_attempts_player_name_started_idx
on public.score_attempts ((lower(btrim(player_name))), started_at desc);

create table if not exists public.score_attempt_events (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_id uuid not null references public.score_attempts (id) on delete cascade,
  event_type text not null check (event_type in ('attempt_started', 'answer_accepted', 'attempt_finalized', 'score_saved')),
  player_name text not null check (char_length(trim(player_name)) between 1 and 40),
  client_type text not null check (client_type in ('android', 'web')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists score_attempt_events_attempt_created_idx
on public.score_attempt_events (attempt_id, created_at desc);

create or replace function public.save_attempt_score_from_attempt(
  target_attempt_id uuid,
  target_player_name text,
  score integer,
  percentage integer,
  total_questions integer,
  elapsed_seconds integer default null,
  target_selection_fingerprint text default null,
  target_saved_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  attempt_row public.score_attempts;
  old_best_row public.test_scores;
  saved_row public.test_scores;
  replaced_best boolean;
  payload jsonb;
begin
  select *
  into attempt_row
  from public.score_attempts
  where id = target_attempt_id
  for update;

  if not found then
    raise exception 'The score attempt could not be found.';
  end if;

  if attempt_row.score_saved_at is not null and attempt_row.score_saved_payload is not null then
    return attempt_row.score_saved_payload;
  end if;

  select *
  into old_best_row
  from public.test_scores as scores
  where lower(btrim(scores.player_name)) = lower(btrim(coalesce(target_player_name, '')))
  order by
    scores.score desc,
    scores.percentage desc,
    scores.elapsed_seconds asc nulls last,
    scores.completed_at asc
  limit 1;

  saved_row := public.save_player_score(
    target_player_name := target_player_name,
    score := score,
    percentage := percentage,
    total_questions := total_questions,
    elapsed_seconds := elapsed_seconds
  );

  replaced_best :=
    old_best_row.id is null
    or saved_row.score > old_best_row.score
    or (
      saved_row.score = old_best_row.score
      and saved_row.percentage > old_best_row.percentage
    )
    or (
      saved_row.score = old_best_row.score
      and saved_row.percentage = old_best_row.percentage
      and saved_row.elapsed_seconds is not null
      and (
        old_best_row.elapsed_seconds is null
        or saved_row.elapsed_seconds < old_best_row.elapsed_seconds
      )
    );

  payload := jsonb_build_object(
    'record', to_jsonb(saved_row),
    'audit', jsonb_build_object(
      'attemptId', target_attempt_id,
      'playerName', saved_row.player_name,
      'clientType', attempt_row.client_type,
      'selectionFingerprint', coalesce(target_selection_fingerprint, attempt_row.selection_fingerprint),
      'oldBest', to_jsonb(old_best_row),
      'newBest', to_jsonb(saved_row),
      'replacedBest', replaced_best,
      'savedAt', target_saved_at,
      'score', saved_row.score,
      'percentage', saved_row.percentage,
      'totalQuestions', saved_row.total_questions,
      'elapsedSeconds', saved_row.elapsed_seconds
    )
  );

  update public.score_attempts
  set
    selection_fingerprint = coalesce(target_selection_fingerprint, attempt_row.selection_fingerprint),
    score_saved_at = target_saved_at,
    score_saved_score = saved_row.score,
    score_saved_percentage = saved_row.percentage,
    score_saved_elapsed_seconds = saved_row.elapsed_seconds,
    score_saved_payload = payload
  where id = target_attempt_id;

  insert into public.score_attempt_events (
    attempt_id,
    event_type,
    player_name,
    client_type,
    metadata
  )
  values (
    target_attempt_id,
    'score_saved',
    saved_row.player_name,
    attempt_row.client_type,
    payload -> 'audit'
  );

  return payload;
end;
$$;

create or replace function public.touch_notification_device_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists notification_devices_set_updated_at on public.notification_devices;
create trigger notification_devices_set_updated_at
before update on public.notification_devices
for each row
execute function public.touch_notification_device_updated_at();

drop trigger if exists score_attempts_set_updated_at on public.score_attempts;
create trigger score_attempts_set_updated_at
before update on public.score_attempts
for each row
execute function public.touch_notification_device_updated_at();

create or replace function public.get_player_top_score(target_player_name text)
returns table (
  player_name text,
  score integer,
  percentage integer,
  total_questions integer,
  elapsed_seconds integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    scores.player_name,
    scores.score,
    scores.percentage,
    scores.total_questions,
    scores.elapsed_seconds,
    scores.completed_at
  from public.test_scores as scores
  where lower(btrim(scores.player_name)) = lower(btrim(coalesce(target_player_name, '')))
  order by
    scores.score desc,
    scores.percentage desc,
    scores.elapsed_seconds asc nulls last,
    scores.completed_at asc
  limit 1;
$$;

create or replace function public.save_player_score(
  target_player_name text,
  score integer,
  percentage integer,
  total_questions integer,
  elapsed_seconds integer default null
)
returns public.test_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  saved_row public.test_scores;
begin
  normalized_name := btrim(coalesce(target_player_name, ''));

  if char_length(normalized_name) < 1 or char_length(normalized_name) > 40 then
    raise exception 'Player name must be between 1 and 40 characters.';
  end if;

  if score is null or score < 0 then
    raise exception 'Score must be 0 or greater.';
  end if;

  if percentage is null or percentage < 0 or percentage > 100 then
    raise exception 'Percentage must be between 0 and 100.';
  end if;

  if total_questions is null or total_questions <= 0 then
    raise exception 'Total questions must be greater than 0.';
  end if;

  if elapsed_seconds is not null and elapsed_seconds < 0 then
    raise exception 'Elapsed seconds must be 0 or greater.';
  end if;

  insert into public.test_scores (
    player_name,
    score,
    percentage,
    total_questions,
    elapsed_seconds,
    completed_at
  )
  values (
    normalized_name,
    score,
    percentage,
    total_questions,
    elapsed_seconds,
    timezone('utc', now())
  )
  on conflict ((lower(btrim(player_name))))
  do update
  set
    player_name = excluded.player_name,
    score = excluded.score,
    percentage = excluded.percentage,
    total_questions = excluded.total_questions,
    elapsed_seconds = excluded.elapsed_seconds,
    completed_at = excluded.completed_at
  where
    excluded.score > test_scores.score
    or (
      excluded.score = test_scores.score
      and excluded.percentage > test_scores.percentage
    )
    or (
      excluded.score = test_scores.score
      and excluded.percentage = test_scores.percentage
      and excluded.elapsed_seconds is not null
      and (
        test_scores.elapsed_seconds is null
        or excluded.elapsed_seconds < test_scores.elapsed_seconds
      )
    )
  returning * into saved_row;

  if saved_row.id is null then
    select *
    into saved_row
    from public.test_scores as scores
    where lower(btrim(scores.player_name)) = lower(normalized_name)
    limit 1;
  end if;

  return saved_row;
end;
$$;

create or replace function public.set_reset_pin(new_reset_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_reset_pin is null or btrim(new_reset_pin) = '' then
    raise exception 'Please choose a reset PIN before enabling score reset.';
  end if;

  insert into public.app_admin_settings (id, reset_pin_hash, updated_at)
  values (
    true,
    extensions.crypt(new_reset_pin, extensions.gen_salt('bf')),
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    reset_pin_hash = excluded.reset_pin_hash,
    updated_at = timezone('utc', now());
end;
$$;

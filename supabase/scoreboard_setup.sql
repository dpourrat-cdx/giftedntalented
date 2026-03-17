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

alter table public.test_scores
add column if not exists elapsed_seconds integer check (elapsed_seconds is null or elapsed_seconds >= 0);

create table if not exists public.app_admin_settings (
  id boolean primary key default true,
  reset_pin_hash text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  check (id = true)
);

alter table public.test_scores enable row level security;
alter table public.app_admin_settings enable row level security;

drop policy if exists "Allow score inserts" on public.test_scores;
revoke all on table public.app_admin_settings from anon, authenticated;
revoke insert on table public.test_scores from anon, authenticated;

with ranked_scores as (
  select
    id,
    row_number() over (
      partition by lower(btrim(player_name))
      order by
        score desc,
        percentage desc,
        elapsed_seconds asc nulls last,
        completed_at asc,
        id asc
    ) as score_rank
  from public.test_scores
)
delete from public.test_scores as scores
using ranked_scores
where scores.id = ranked_scores.id
  and ranked_scores.score_rank > 1;

create unique index if not exists test_scores_player_name_unique
on public.test_scores ((lower(btrim(player_name))));

create or replace function public.get_top_score()
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
  order by
    scores.percentage desc,
    scores.score desc,
    scores.elapsed_seconds asc nulls last,
    scores.completed_at asc
  limit 1;
$$;

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
    raise exception 'Please choose a reset PIN before enabling leader board reset.';
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

create or replace function public.reset_scores(reset_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  saved_hash text;
  deleted_count integer;
begin
  select settings.reset_pin_hash
  into saved_hash
  from public.app_admin_settings as settings
  where settings.id = true;

  if saved_hash is null then
    raise exception 'Reset PIN has not been configured yet.';
  end if;

  if reset_pin is null or extensions.crypt(reset_pin, saved_hash) <> saved_hash then
    raise exception 'That admin PIN did not match.';
  end if;

  delete from public.test_scores
  where true;
  get diagnostics deleted_count = row_count;

  return jsonb_build_object(
    'deleted_count', deleted_count,
    'reset_at', timezone('utc', now())
  );
end;
$$;

grant execute on function public.get_top_score() to anon, authenticated;
grant execute on function public.get_player_top_score(text) to anon, authenticated;
grant execute on function public.save_player_score(text, integer, integer, integer, integer) to anon, authenticated;
grant execute on function public.reset_scores(text) to anon, authenticated;

revoke all on function public.set_reset_pin(text) from public;
revoke all on function public.set_reset_pin(text) from anon, authenticated;

comment on function public.get_top_score() is
'Returns the best single test score overall for the public leader board.';

comment on function public.get_player_top_score(text) is
'Returns the best saved score for the provided child name without exposing scores from other names.';

comment on function public.save_player_score(text, integer, integer, integer, integer) is
'Stores only the best saved score for the provided child name, updating the existing row only when the new result is better.';

comment on function public.reset_scores(text) is
'Clears saved scores when the provided admin PIN matches the stored bcrypt hash.';

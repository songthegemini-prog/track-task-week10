-- US-1 / AC-1.1: profiles created atomically by Supabase Auth.
-- Run once in Supabase SQL Editor. No secret/service-role key is required by the app.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users (id),
  display_name text not null check (length(btrim(display_name)) > 0),
  email text not null check (length(btrim(email)) > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

-- US-2 will add a separate teammate-read policy when membership exists.
create policy "profiles: owner can read own"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()));

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email)
  values (new.id, btrim(new.raw_user_meta_data ->> 'display_name'), new.email);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_profile_email();

-- Preserve any accounts created while setting up the workshop.
-- A missing name on an existing email account uses its email prefix once.
-- New signups above must always provide a nonblank display_name.
insert into public.profiles (user_id, display_name, email)
select id,
  coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1)),
  email
from auth.users;

commit;

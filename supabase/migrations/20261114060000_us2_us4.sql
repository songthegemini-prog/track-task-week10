-- Apply AFTER 20261114042000_us1_profiles.sql. US-2, US-3, US-4.
begin;
create table public.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name))>0),
 invite_code text not null unique check(invite_code ~ '^[A-Z0-9]{6}$'),
 created_by uuid not null unique references public.profiles(user_id),
 created_at timestamptz not null default now()
);
create table public.team_members (
 user_id uuid primary key references public.profiles(user_id),
 team_id uuid not null references public.teams(id),
 joined_at timestamptz not null default now(),
 unique(team_id,user_id)
);
alter table public.teams add constraint teams_leader_is_member
 foreign key(id,created_by) references public.team_members(team_id,user_id)
 deferrable initially deferred;
create index team_members_team_idx on public.team_members(team_id);
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on public.teams,public.team_members from public,anon,authenticated;
grant select on public.teams,public.team_members to authenticated;

create function public.current_team_id() returns uuid language sql stable
 security definer set search_path='' as $$
 select team_id from public.team_members where user_id=(select auth.uid());
$$;
create function public.is_team_lead(p_team uuid) returns boolean language sql stable
 security definer set search_path='' as $$
 select exists(select 1 from public.teams where id=p_team and created_by=(select auth.uid()));
$$;
create function public.is_current_team_member(target_user_id uuid) returns boolean language sql stable
 security definer set search_path='' as $$
 select exists(select 1 from public.team_members where user_id=target_user_id and team_id=public.current_team_id());
$$;
revoke all on function public.current_team_id(),public.is_team_lead(uuid),public.is_current_team_member(uuid) from public,anon;
grant execute on function public.current_team_id(),public.is_team_lead(uuid),public.is_current_team_member(uuid) to authenticated;
create policy teams_read on public.teams for select to authenticated using(id=(select public.current_team_id()));
create policy members_read on public.team_members for select to authenticated using(team_id=(select public.current_team_id()));
create policy profiles_teammates_read on public.profiles for select to authenticated using(public.is_current_team_member(user_id));

create function public.create_team(team_name text) returns uuid language plpgsql
 security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); tid uuid; attempts integer;
begin
 if uid is null then raise exception 'NOT_LOGGED_IN'; end if;
 perform 1 from public.profiles where user_id=uid for update;
 if public.current_team_id() is not null then raise exception 'ALREADY_IN_TEAM'; end if;
 if coalesce(btrim(team_name),'')='' then raise exception 'TEAM_NAME_REQUIRED'; end if;
 for attempts in 1..10 loop
  begin
   insert into public.teams(name,invite_code,created_by)
   values(btrim(team_name),upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),uid) returning id into tid;
   exit;
  exception when unique_violation then
   if attempts=10 then raise exception 'CREATE_TEAM_FAILED'; end if;
  end;
 end loop;
 insert into public.team_members(user_id,team_id) values(uid,tid);
 return tid;
end; $$;
create function public.join_team(invite_code text) returns uuid language plpgsql
 security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); tid uuid;
begin
 if uid is null then raise exception 'NOT_LOGGED_IN'; end if;
 perform 1 from public.profiles where user_id=uid for update;
 if public.current_team_id() is not null then raise exception 'ALREADY_IN_TEAM'; end if;
 select t.id into tid from public.teams t where t.invite_code=upper(btrim(join_team.invite_code));
 if tid is null then raise exception 'TEAM_NOT_FOUND'; end if;
 insert into public.team_members(user_id,team_id) values(uid,tid);
 return tid;
end; $$;
revoke all on function public.create_team(text),public.join_team(text) from public,anon;
grant execute on function public.create_team(text),public.join_team(text) to authenticated;

create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id),
 title text not null check(length(btrim(title))>0),
 description text, due_date date,
 assignee_id uuid not null references public.profiles(user_id),
 created_by uuid not null references public.profiles(user_id),
 status text not null default 'todo' check(status in ('todo','in_progress','done')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(team_id,assignee_id) references public.team_members(team_id,user_id)
);
create index tasks_team_status_idx on public.tasks(team_id,status);
create index tasks_assignee_due_idx on public.tasks(assignee_id,due_date);
alter table public.tasks enable row level security;
revoke all on public.tasks from public,anon,authenticated;
grant select,update on public.tasks to authenticated;
create policy tasks_read on public.tasks for select to authenticated using(team_id=(select public.current_team_id()));
create policy tasks_update on public.tasks for update to authenticated
 using(team_id=(select public.current_team_id()) and (public.is_team_lead(team_id) or assignee_id=(select auth.uid())))
 with check(team_id=(select public.current_team_id()) and (public.is_team_lead(team_id) or assignee_id=(select auth.uid())));

create function public.tasks_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not public.is_team_lead(new.team_id) or new.created_by is distinct from (select auth.uid()) or new.status<>'todo' then raise exception 'LEAD_REQUIRED'; end if;
 else
  if row(new.id,new.team_id,new.created_by,new.created_at) is distinct from row(old.id,old.team_id,old.created_by,old.created_at) then raise exception 'IMMUTABLE_TASK_FIELDS'; end if;
  if not public.is_team_lead(old.team_id) and (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then raise exception 'ONLY_STATUS_ALLOWED'; end if;
  new.updated_at:=clock_timestamp();
 end if;
 return new;
end; $$;
revoke all on function public.tasks_guard() from public,anon,authenticated;
create trigger tasks_guard before insert or update on public.tasks for each row execute function public.tasks_guard();

create function public.create_task(title text,description text,due_date date,assignee_id uuid) returns uuid
 language plpgsql security definer set search_path='' as $$
declare tid uuid:=public.current_team_id(); result uuid; uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'NOT_LOGGED_IN'; end if;
 if tid is null or not public.is_team_lead(tid) then raise exception 'LEAD_REQUIRED'; end if;
 if coalesce(btrim(title),'')='' then raise exception 'TASK_TITLE_REQUIRED'; end if;
 if not exists(select 1 from public.team_members m where m.team_id=tid and m.user_id=assignee_id) then raise exception 'ASSIGNEE_NOT_MEMBER'; end if;
 insert into public.tasks(team_id,title,description,due_date,assignee_id,created_by)
 values(tid,btrim(title),description,due_date,assignee_id,uid) returning id into result;
 return result;
end; $$;
revoke all on function public.create_task(text,text,date,uuid) from public,anon;
grant execute on function public.create_task(text,text,date,uuid) to authenticated;
commit;

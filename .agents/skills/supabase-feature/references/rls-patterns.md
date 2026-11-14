# รูปแบบ RLS ที่ใช้บ่อย (ระบบงานทีม)

ปรับชื่อตารางและคอลัมน์ให้ตรง `docs/design.md` ทุกครั้ง ไม่คัดลอกทั้งชุดโดยไม่ตรวจ ถ้าไม่มี policy สำหรับการกระทำใด การกระทำนั้นจะถูกปฏิเสธ (deny by default)

- `using` กรองแถวที่มองเห็นหรือแก้ได้ ส่วน `with check` ตรวจแถวใหม่ที่กำลังจะเขียน
- policy ของ update ต้องมีทั้ง `using` และ `with check`
- ใช้ `(select auth.uid())` แทน `auth.uid()` ใน policy เพื่อให้ฐานข้อมูลคำนวณครั้งเดียว
- คอลัมน์ที่เก็บผู้ใช้ในตารางของแอปให้อ้าง `public.profiles (id)` เพื่อดึงชื่อมาแสดงพร้อมกันได้ เช่น `select("*, assignee:profiles!assignee_id(display_name)")`

## โปรไฟล์ที่สร้างอัตโนมัติตอนสมัคร (US-1)

ส่งชื่อที่แสดงตอนสมัครผ่าน `supabase.auth.signUp({ email, password, options: { data: { display_name } } })` แล้วให้ trigger สร้างแถวใน `profiles` เอง ผู้ใช้จึงไม่ต้อง insert เอง

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy "profiles: owner can update own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
```

policy สำหรับอ่านโปรไฟล์ของเพื่อนร่วมทีม ให้เพิ่มใน US-2 หลังมีตาราง `team_members` (ดูด้านล่าง) ระหว่าง US-1 ให้อ่านได้เฉพาะของตัวเอง

```sql
create policy "profiles: owner can read own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);
```

## ทีม สมาชิก และ function ช่วยตรวจสิทธิ์ (US-2)

```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  join_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade, -- unique: 1 คนอยู่ได้ 1 ทีม
  role text not null check (role in ('lead', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
```

policy ที่ต้องเช็กว่า "ผู้ใช้อยู่ทีมนี้ไหม" ถ้าเขียน query ไปที่ `team_members` ตรง ๆ ใน policy ของ `team_members` เอง จะวนเรียกตัวเองไม่จบ (infinite recursion) จึงทำเป็น function แบบ `security definer` ที่คืนแค่จริง/เท็จ

```sql
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_team_lead(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = (select auth.uid()) and m.role = 'lead'
  );
$$;

-- ผู้ใช้ p_user_id อยู่ทีมเดียวกับคนที่ล็อกอินอยู่ไหม (ใช้กับ profiles)
create or replace function public.shares_team_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members me
    join public.team_members them on them.team_id = me.team_id
    where me.user_id = (select auth.uid()) and them.user_id = p_user_id
  );
$$;

-- ผู้ใช้ p_user_id เป็นสมาชิกทีม p_team_id ไหม (ใช้ตรวจผู้รับงาน)
create or replace function public.is_member_of(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = p_user_id
  );
$$;

revoke all on function public.is_member_of(uuid, uuid) from public, anon;
grant execute on function public.is_member_of(uuid, uuid) to authenticated;
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_lead(uuid) from public, anon;
revoke all on function public.shares_team_with(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_lead(uuid) to authenticated;
grant execute on function public.shares_team_with(uuid) to authenticated;

create policy "teams: members can read"
on public.teams for select
to authenticated
using (public.is_team_member(id));

create policy "team_members: teammates can read"
on public.team_members for select
to authenticated
using (public.is_team_member(team_id));

create policy "profiles: teammates can read"
on public.profiles for select
to authenticated
using (public.shares_team_with(id));
```

ไม่มี policy insert/update/delete บน `teams` และ `team_members` การสร้างและเข้าร่วมทีมทำผ่าน function ด้านล่างเท่านั้น

## สร้างทีม และเข้าร่วมด้วยรหัสเชิญ

คนที่ยังไม่อยู่ในทีมอ่านตาราง `teams` ไม่ได้ (ถูกต้องแล้ว ไม่อย่างนั้นทุกคนจะเห็นรหัสเชิญของทุกทีม) จึงให้ function ตรวจรหัสแทน และคืนแค่ id ของทีม เรียกจากแอปด้วย `supabase.rpc("join_team", { p_code })`

```sql
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_team_id uuid;
begin
  if v_uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;
  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_TEAM';
  end if;

  insert into public.teams (name, join_code, created_by)
  values (trim(p_name), upper(substr(md5(gen_random_uuid()::text), 1, 6)), v_uid)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_uid, 'lead');

  return v_team_id;
exception
  when unique_violation then raise exception 'ALREADY_IN_TEAM';
end;
$$;

create or replace function public.join_team(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_team_id uuid;
begin
  if v_uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_TEAM';
  end if;

  select id into v_team_id from public.teams where join_code = upper(trim(p_code));
  if v_team_id is null then raise exception 'TEAM_NOT_FOUND'; end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_uid, 'member');

  return v_team_id;
exception
  when unique_violation then raise exception 'ALREADY_IN_TEAM';
end;
$$;

revoke all on function public.create_team(text) from public, anon;
revoke all on function public.join_team(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;
```

แอปแปลงรหัส error เป็นข้อความภาษาไทย: `ALREADY_IN_TEAM` → "คุณมีทีมอยู่แล้ว", `TEAM_NOT_FOUND` → "ไม่พบทีมจากรหัสนี้", `TEAM_NAME_REQUIRED` → "กรุณากรอกชื่อทีม"

## งานของทีม (US-3, US-4)

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  detail text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create index if not exists tasks_team_id_idx on public.tasks (team_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);

-- อ่าน: สมาชิกทีมเห็นงานทุกชิ้นของทีมตัวเอง
create policy "tasks: team members can read"
on public.tasks for select
to authenticated
using (public.is_team_member(team_id));

-- สร้าง: หัวหน้าเท่านั้น และผู้รับงานต้องเป็นสมาชิกทีมเดียวกัน
create policy "tasks: lead can insert"
on public.tasks for insert
to authenticated
with check (
  public.is_team_lead(team_id)
  and created_by = (select auth.uid())
  and public.is_member_of(team_id, assignee_id)
);

-- แก้: หัวหน้า หรือผู้รับงานของงานนั้น
create policy "tasks: lead or assignee can update"
on public.tasks for update
to authenticated
using (public.is_team_lead(team_id) or assignee_id = (select auth.uid()))
with check (
  (public.is_team_lead(team_id) or assignee_id = (select auth.uid()))
  and public.is_member_of(team_id, assignee_id)
);
```

## ผู้รับงานแก้ได้เฉพาะสถานะ (AC-4.4)

policy บอกได้แค่ว่า "แก้แถวนี้ได้ไหม" แต่บอกไม่ได้ว่า "แก้คอลัมน์ไหนได้" จึงใช้ trigger ตรวจว่าคนที่ไม่ใช่หัวหน้าเปลี่ยนแค่ `status`

```sql
create or replace function public.tasks_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id or new.created_by is distinct from old.created_by then
    raise exception 'CANNOT_CHANGE_OWNER';
  end if;

  if not public.is_team_lead(old.team_id) and (
       new.title is distinct from old.title
    or new.detail is distinct from old.detail
    or new.due_date is distinct from old.due_date
    or new.assignee_id is distinct from old.assignee_id
  ) then
    raise exception 'ONLY_STATUS_ALLOWED';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_guard_update
before update on public.tasks
for each row execute function public.tasks_guard_update();
```

แอปแปลง `ONLY_STATUS_ALLOWED` เป็น "คุณแก้ได้เฉพาะสถานะของงานนี้"

## ห้ามทำ

- `disable row level security` เพื่อให้ query ผ่าน
- policy `using (true)` บนตารางของทีม หรือโปรไฟล์
- เขียน policy ของ `team_members` ที่ query `team_members` ตรง ๆ (จะเกิด infinite recursion) ให้ใช้ function `is_team_member` แทน
- เปิด policy select บน `teams` ให้คนนอกทีม เพื่อให้ค้นรหัสเชิญได้ ให้ใช้ `join_team` แทน
- ใช้ secret key ฝั่ง browser เพื่อหลบ RLS

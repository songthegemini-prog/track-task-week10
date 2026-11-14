import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const migration=new URL('../supabase/migrations/20261114060000_us2_us4.sql',import.meta.url);
const ids=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`);
test('US-2–US-4 database rules',async t=>{
 assert.ok(existsSync(migration),'Team and task migration is missing');
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261114042000_us1_profiles.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(migration,'utf8'));
 for(const [i,id] of ids.entries()) await db.query('insert into auth.users values($1,$2,$3)',[id,`${i}@example.test`,JSON.stringify({display_name:`User ${i}`})]);
 async function as(id,sql,params=[],commit=true){
  await db.exec('begin; set local role authenticated');
  try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);const result=await db.query(sql,params);await db.exec(commit?'commit':'rollback');return result.rows;}
  catch(e){await db.exec('rollback');throw e;}
 }
 const [a,b,c,d]=ids;
 await t.test('AC-2.5 blank team name rejected',()=>assert.rejects(as(a,"select public.create_team('   ')"),/TEAM_NAME_REQUIRED/));
 const team1=(await as(a,"select public.create_team('ทีมหนึ่ง') as id"))[0].id;
 const code=(await as(a,'select invite_code from public.teams'))[0].invite_code;
 await t.test('AC-2.2 creator is a member and invite has six characters',async()=>{assert.match(code,/^[A-Z0-9]{6}$/);assert.equal((await as(a,'select user_id from public.team_members'))[0].user_id,a);});
 await t.test('AC-2.3 wrong code does not leak team',()=>assert.rejects(as(b,"select public.join_team('??????')"),/TEAM_NOT_FOUND/));
 await as(b,'select public.join_team($1)',[code.toLowerCase()]);
 const team2=(await as(c,"select public.create_team('ทีมสอง') as id"))[0].id;
 await t.test('AC-2.4 existing member cannot create/join another team',async()=>{await assert.rejects(as(b,"select public.create_team('อื่น')"),/ALREADY_IN_TEAM/);await assert.rejects(as(b,'select public.join_team($1)',[code]),/ALREADY_IN_TEAM/);});
 await t.test('AC-2.6 outsiders cannot read teams, members or profiles',async()=>{assert.equal((await as(c,'select * from public.teams where id=$1',[team1])).length,0);assert.equal((await as(c,'select * from public.team_members where team_id=$1',[team1])).length,0);assert.deepEqual((await as(c,'select user_id from public.profiles')).map(r=>r.user_id),[c]);assert.equal((await as(d,'select * from public.teams')).length,0);});
 await t.test('teammates can read names without policy recursion',async()=>assert.equal((await as(b,'select * from public.profiles')).length,2));
 const create=(who,title,assignee)=>as(who,'select public.create_task($1,null,null,$2) as id',[title,assignee]);
 await t.test('AC-3.3 only lead creates tasks',()=>assert.rejects(create(b,'forged',b),/LEAD_REQUIRED/));
 await t.test('AC-3.4 outside assignee rejected by database function',()=>assert.rejects(create(a,'bad',c),/ASSIGNEE_NOT_MEMBER/));
 await t.test('AC-3.5 blank task rejected',()=>assert.rejects(create(a,' ',b),/TASK_TITLE_REQUIRED/));
 const task=(await create(a,'งานทดสอบ',b))[0].id;
 const own=(await create(a,'งานหัวหน้า',a))[0].id;
 await t.test('AC-3.1 default status is todo and lead may assign self',async()=>{assert.equal((await as(a,'select status from public.tasks where id=$1',[task]))[0].status,'todo');assert.equal((await as(a,'select assignee_id from public.tasks where id=$1',[own]))[0].assignee_id,a);});
 await t.test('AC-3.7 cross-team tasks invisible',async()=>assert.equal((await as(c,'select * from public.tasks')).length,0));
 await t.test('AC-4.1 assignee can change status both ways',async()=>{for(const status of ['in_progress','done','todo'])assert.equal((await as(b,'update public.tasks set status=$1 where id=$2 returning status',[status,task]))[0].status,status);});
 await t.test('AC-4.2 lead can update another assignee task',async()=>assert.equal((await as(a,"update public.tasks set status='done' where id=$1 returning id",[task])).length,1));
 await t.test('AC-4.3 other member and outsider cannot update',async()=>{assert.equal((await as(b,"update public.tasks set status='done' where id=$1 returning id",[own])).length,0);assert.equal((await as(c,"update public.tasks set status='todo' where id=$1 returning id",[task])).length,0);});
 await t.test('AC-4.4 all non-status edits are rejected atomically',async()=>{for(const assignment of ["title='hack'","description='hack'","due_date='2020-01-01'",`assignee_id='${a}'`,`team_id='${team2}'`,`created_by='${b}'`,"created_at=now()","updated_at=now()"]){await assert.rejects(as(b,`update public.tasks set ${assignment},status='todo' where id=$1`,[task]));}assert.equal((await as(a,'select title,status from public.tasks where id=$1',[task]))[0].title,'งานทดสอบ');});
 await t.test('lead reassignment still requires same-team member',()=>assert.rejects(as(a,'update public.tasks set assignee_id=$1 where id=$2',[c,task])));
 await t.test('invalid status rejected',()=>assert.rejects(as(b,"update public.tasks set status='invalid' where id=$1",[task])));
 await t.test('direct inserts/deletes and membership edits denied',async()=>{await assert.rejects(as(a,"insert into public.tasks(team_id,title,assignee_id,created_by) values($1,'bypass',$2,$2)",[team1,a]));await assert.rejects(as(b,'delete from public.team_members where user_id=$1',[b]));await assert.rejects(as(a,'delete from public.tasks where id=$1',[task]));});
 await t.test('all application tables keep RLS enabled',async()=>{const {rows}=await db.query("select relrowsecurity from pg_class where oid in ('public.teams'::regclass,'public.team_members'::regclass,'public.tasks'::regclass)");assert.equal(rows.length,3);assert.ok(rows.every(r=>r.relrowsecurity));});
 await t.test('anon cannot execute team/task functions or read any new table',async()=>{
  for(const sql of ['select * from public.teams','select * from public.team_members','select * from public.tasks',"select public.create_team('bypass')","select public.join_team('ABCDEF')"]){
   await db.exec('begin; set local role anon');
   try{await assert.rejects(db.exec(sql));}finally{await db.exec('rollback');}
  }
 });
 await t.test('requests without a verified user cannot create or join teams',async()=>{await assert.rejects(as('',"select public.create_team('bypass')"),/NOT_LOGGED_IN/);await assert.rejects(as('',"select public.join_team('ABCDEF')"),/NOT_LOGGED_IN/);});
 }finally{await db.close();}
});

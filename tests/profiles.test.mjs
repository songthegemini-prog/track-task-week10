import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = new URL("../supabase/migrations/20261114042000_us1_profiles.sql", import.meta.url);
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const legacy = "33333333-3333-4333-8333-333333333333";

test("US-1 migration enforces signup integrity and profile ownership in local PostgreSQL", async (t) => {
  assert.ok(existsSync(migration), "US-1 profiles migration is missing");
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated;
      insert into auth.users (id, email) values ('${legacy}', 'legacy@example.test');
    `);
    await db.exec(readFileSync(migration, "utf8"));
    await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3),($4,$5,$6)", [
      a, "a@example.test", JSON.stringify({ display_name: " มะลิ ", email: "fake@example.test" }),
      b, "b@example.test", JSON.stringify({ display_name: "สมชาย" }),
    ]);
    async function as(role, id, action) {
      await db.exec(`begin; set local role ${role};`);
      try {
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? ""]);
        return await action();
      } finally { await db.exec("rollback;"); }
    }
    await t.test("AC-1.1 creates a trimmed display name with email from Auth only", async () => {
      assert.deepEqual((await db.query("select user_id,display_name,email from public.profiles where user_id=$1", [a])).rows,
        [{ user_id: a, display_name: "มะลิ", email: "a@example.test" }]);
    });
    await t.test("backfills existing workshop accounts without creating duplicate identities", async () => {
      assert.deepEqual((await db.query("select display_name,email from public.profiles where user_id=$1", [legacy])).rows,
        [{ display_name: "legacy", email: "legacy@example.test" }]);
    });
    await t.test("blank new names roll back the Auth signup", async () => {
      const id = "44444444-4444-4444-8444-444444444444";
      await assert.rejects(db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, "empty@example.test", JSON.stringify({ display_name: "   " })]));
      assert.equal((await db.query("select id from auth.users where id=$1", [id])).rows.length, 0);
    });
    await t.test("NFR-1 profiles has RLS enabled", async () => {
      assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.profiles'::regclass")).rows[0].relrowsecurity, true);
    });
    await t.test("A and B can each read only their own profile without an application filter", async () => {
      for (const id of [a, b]) assert.deepEqual((await as("authenticated", id, () => db.query("select user_id from public.profiles"))).rows, [{ user_id: id }]);
    });
    await t.test("anon cannot read profiles", async () => {
      await assert.rejects(as("anon", null, () => db.query("select * from public.profiles")));
    });
    await t.test("users cannot directly create, modify, or delete profiles", async () => {
      for (const sql of [
        `insert into public.profiles(user_id,display_name,email) values('${a}','ปลอม','fake@example.test')`,
        `update public.profiles set email='fake@example.test' where user_id='${a}'`,
        `delete from public.profiles where user_id='${a}'`,
      ]) await assert.rejects(as("authenticated", a, () => db.exec(sql)));
    });
    await t.test("Auth email changes synchronize without accepting metadata as identity", async () => {
      await db.query("update auth.users set email=$1,raw_user_meta_data=$2 where id=$3",
        ["new@example.test", JSON.stringify({ display_name: "Changed metadata", email: "fake@example.test" }), a]);
      assert.deepEqual((await db.query("select display_name,email from public.profiles where user_id=$1", [a])).rows,
        [{ display_name: "มะลิ", email: "new@example.test" }]);
    });
    await t.test("application roles cannot execute privileged trigger functions", async () => {
      const { rows } = await db.query(`select proname,
        has_function_privilege('authenticated',p.oid,'execute') as allowed,
        has_function_privilege('anon',p.oid,'execute') as anon_allowed
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and proname in ('handle_new_user','sync_profile_email')`);
      assert.equal(rows.length, 2);
      assert.ok(rows.every((r) => !r.allowed && !r.anon_allowed));
    });
  } finally { await db.close(); }
});

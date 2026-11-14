import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { createServerClient } from "@supabase/ssr";

const source = new URL("../lib/auth/flow.ts", import.meta.url);
const id = "11111111-1111-4111-8111-111111111111";
const user = {
  id, aud: "authenticated", role: "authenticated", email: "a@example.test", phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Untrusted metadata" }, identities: [],
  created_at: "2026-11-14T00:00:00Z", updated_at: "2026-11-14T00:00:00Z",
};
async function flow() {
  assert.ok(existsSync(source), "US-1 authentication flow is missing");
  return import(source.href);
}
function form(overrides = {}) {
  const data = new FormData();
  for (const [k, v] of Object.entries({ mode: "login", email: " a@example.test ", password: " secret ", display_name: " มะลิ ", ...overrides })) data.set(k, v);
  return data;
}
function fixture(options = {}) {
  const jar = new Map(), writes = [], requests = [];
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-supabase-api-version": "2024-01-01" } });
  const jwt = [{ alg: "HS256", typ: "JWT" }, { sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 }]
    .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url")).join(".") + ".test-signature";
  const session = { access_token: jwt, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, user };
  const fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? input.href);
    requests.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    if (url.pathname.endsWith("/signup")) return options.signupError
      ? json({ code: "unexpected_failure", msg: "private diagnostic" }, 422)
      : json(options.confirmEmail ? user : session);
    if (url.pathname.endsWith("/token")) return options.wrongPassword
      ? json({ code: "invalid_credentials", msg: "private diagnostic" }, 400) : json(session);
    if (url.pathname.endsWith("/user")) return options.invalidSession
      ? json({ code: "bad_jwt", msg: "bad token" }, 401) : json(user);
    if (url.pathname.endsWith("/logout")) return options.logoutError
      ? json({ code: "unexpected_failure", msg: "private diagnostic" }, 400) : new Response(null, { status: 204 });
    if (url.pathname === "/rest/v1/profiles") {
      if (options.profileError) return json({ code: "42501", message: "private diagnostic" }, 403);
      if (options.missingProfile) return json({ code: "PGRST116", message: "No rows" }, 406);
      assert.equal(url.searchParams.get("user_id"), `eq.${id}`);
      assert.equal(url.searchParams.get("select"), "user_id,display_name,email");
      return json({ user_id: id, display_name: "มะลิจากฐานข้อมูล", email: user.email });
    }
    throw new Error(`Unexpected test request: ${url.pathname}`);
  };
  const client = () => createServerClient("https://auth-fixture.example.test", "test-publishable-key", {
    global: { fetch }, cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => {
        writes.push(c);
        if (c.options.maxAge === 0) jar.delete(c.name); else jar.set(c.name, c.value);
      }),
    },
  });
  return { client, jar, writes, requests };
}

test("AC-1.1 signup normalizes email/name, preserves password, and passes name to Auth", async () => {
  const { authenticate } = await flow();
  const f = fixture();
  assert.deepEqual(await authenticate(f.client(), form({ mode: "signup" })), { ok: true });
  const { body } = f.requests.find((r) => r.url.pathname.endsWith("/signup"));
  assert.equal(body.email, "a@example.test");
  assert.equal(body.password, " secret ");
  assert.deepEqual(body.data, { display_name: "มะลิ" });
});
for (const [label, values, expected] of [
  ["blank name", { mode: "signup", display_name: "   " }, "กรุณากรอกชื่อที่แสดง"],
  ["short signup password", { mode: "signup", password: "12345" }, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"],
  ["invalid email", { email: "invalid" }, "กรุณากรอกอีเมลให้ถูกต้อง"],
  ["blank password", { password: "" }, "กรุณากรอกรหัสผ่าน"],
  ["unknown operation", { mode: "admin" }, "คำขอไม่ถูกต้อง กรุณาลองใหม่"],
]) test(`rejects ${label} before any external request`, async () => {
  const { authenticate } = await flow();
  const f = fixture();
  const result = await authenticate(f.client(), form(values));
  assert.deepEqual(result, { ok: false, message: expected });
  assert.equal(f.requests.length, 0);
});
test("AC-1.1 accepts a six-character signup password", async () => {
  const { authenticate } = await flow();
  assert.deepEqual(await authenticate(fixture().client(), form({ mode: "signup", password: "123456" })), { ok: true });
});
test("confirmation-required signup does not report an authenticated account", async () => {
  const { authenticate } = await flow();
  const result = await authenticate(fixture({ confirmEmail: true }).client(), form({ mode: "signup" }));
  assert.equal(result.ok, false);
  assert.match(result.message, /ยืนยันอีเมล/);
});
test("AC-1.2 wrong credentials produce the required safe Thai message", async () => {
  const { authenticate } = await flow();
  assert.deepEqual(await authenticate(fixture({ wrongPassword: true }).client(), form()), { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
});
test("signup failure does not expose private diagnostics or report success", async () => {
  const { authenticate } = await flow();
  const result = await authenticate(fixture({ signupError: true }).client(), form({ mode: "signup" }));
  assert.equal(result.ok, false);
  assert.match(result.message, /สมัครสมาชิกไม่สำเร็จ/);
  assert.doesNotMatch(result.message, /private|diagnostic/);
});
test("AC-1.3 displays the verified user's database name rather than metadata", async () => {
  const { authenticate, getAccount } = await flow();
  const f = fixture(), client = f.client();
  await authenticate(client, form());
  assert.deepEqual(await getAccount(client), { kind: "authenticated", userId: id, displayName: "มะลิจากฐานข้อมูล", email: "a@example.test" });
});
test("missing or unreadable profiles return a safe error rather than a fabricated name", async () => {
  const { authenticate, getAccount } = await flow();
  for (const options of [{ profileError: true }, { missingProfile: true }]) {
    const f = fixture(options), client = f.client();
    await authenticate(client, form());
    const result = await getAccount(client);
    assert.equal(result.kind, "error");
    assert.doesNotMatch(result.message, /private|diagnostic/);
  }
});
test("AC-1.4 restores a new request from persistent cookies without resubmitting credentials", async () => {
  const { authenticate, getAccount } = await flow();
  const f = fixture();
  await authenticate(f.client(), form());
  assert.ok(f.writes.some((c) => c.name.includes("auth-token") && c.options.maxAge >= 86400));
  assert.equal((await getAccount(f.client())).kind, "authenticated");
});
test("AC-1.5 absent and invalid sessions are anonymous", async () => {
  const { authenticate, getAccount } = await flow();
  assert.deepEqual(await getAccount(fixture().client()), { kind: "anonymous" });
  const f = fixture({ invalidSession: true }), client = f.client();
  await authenticate(client, form());
  assert.deepEqual(await getAccount(client), { kind: "anonymous" });
});
test("AC-1.3 logout clears cookies and the next request becomes anonymous", async () => {
  const { authenticate, getAccount, signOutAccount } = await flow();
  const f = fixture(), client = f.client();
  await authenticate(client, form());
  assert.equal(await signOutAccount(client), null);
  assert.deepEqual(await getAccount(f.client()), { kind: "anonymous" });
  assert.ok(f.writes.some((c) => c.name.includes("auth-token") && c.options.maxAge === 0));
});
test("logout failure is reported without falsely claiming the session was removed", async () => {
  const { authenticate, signOutAccount } = await flow();
  const f = fixture({ logoutError: true }), client = f.client();
  await authenticate(client, form());
  assert.equal(await signOutAccount(client), "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
  assert.ok(f.jar.size > 0);
});

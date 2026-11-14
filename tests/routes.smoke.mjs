import assert from "node:assert/strict";
import { test } from "node:test";

// Run against an already running local app; no account or remote database writes.
const base = process.env.TEST_BASE_URL || "http://localhost:3101";

test("AC-1.1 login route renders a usable sign-in form", async () => {
  const response = await fetch(`${base}/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /type="email"/);
  assert.match(html, /type="password"/);
  assert.match(html, /สมัครสมาชิก/);
  assert.match(html, /เข้าสู่ระบบ/);
});

for (const route of ["/team", "/tasks", "/my"]) {
  test(`AC-1.5 anonymous ${route} redirects to login`, async () => {
    const response = await fetch(`${base}${route}`, { redirect: "manual" });
    // Next streams a meta redirect when the loading boundary has already sent 200.
    if (response.status === 307) {
      assert.equal(response.headers.get("location"), "/login");
    } else {
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<meta[^>]*http-equiv="refresh"[^>]*content="[01];url=\/login"/);
      assert.doesNotMatch(html, /ออกจากระบบ|ยังไม่มีข้อมูลทีม/);
    }
    assert.match(response.headers.get("cache-control") || "", /no-store|private/);
  });
}

test("server form validation rejects malformed input without a browser or Auth call", async () => {
  const html = await (await fetch(`${base}/login`)).text();
  const form = new FormData();
  // React's progressive enhancement fields identify the actual rendered Server Action.
  for (const match of html.matchAll(/<input\b[^>]*>/g)) {
    const name = /\bname="([^"]*)"/.exec(match[0])?.[1];
    if (!name?.startsWith("$ACTION_")) continue;
    const rawValue = /\bvalue="([^"]*)"/.exec(match[0])?.[1] || "";
    const value = rawValue.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
    form.append(name, value);
  }
  assert.ok([...form.keys()].some((name) => name.startsWith("$ACTION_")));
  form.set("mode", "login");
  form.set("email", "invalid-email");
  form.set("password", "123456");
  const response = await fetch(`${base}/login`, { method: "POST", headers: { origin: base }, body: form });
  assert.equal(response.status, 200);
  const result = await response.text();
  assert.match(result, /กรุณากรอกอีเมลให้ถูกต้อง/);
  assert.doesNotMatch(result, /private diagnostic/);
});

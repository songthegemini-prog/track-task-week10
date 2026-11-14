"use client";

import { useActionState, useState } from "react";
import { authenticateAction } from "@/app/auth-actions";

const inputClass = "mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

export function LoginForm({ available }: { available: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [state, action, pending] = useActionState(authenticateAction, { message: "" });
  const signup = mode === "signup";

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid grid-cols-2 gap-2" aria-label="เลือกเข้าสู่ระบบหรือสมัครสมาชิก">
        {([ ["login", "เข้าสู่ระบบ"], ["signup", "สมัครสมาชิก"] ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} disabled={pending}
            onClick={() => setMode(value)}
            className={`rounded-lg px-3 py-2.5 font-semibold focus-visible:outline-2 focus-visible:outline-blue-700 ${mode === value ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>
      <h2 className="mt-6 text-xl font-bold">{signup ? "สร้างบัญชีของคุณ" : "ยินดีต้อนรับกลับ"}</h2>
      <p className="mt-1 text-sm text-slate-600">{signup ? "ตั้งชื่อที่เพื่อนร่วมทีมจะเห็น และใช้อีเมลของคุณสมัคร" : "ใช้อีเมลและรหัสผ่านเพื่อเข้าใช้งาน"}</p>
      <form action={action} className="mt-5 space-y-4" aria-busy={pending}>
        <input type="hidden" name="mode" value={mode} />
        <fieldset disabled={pending || !available} className="min-w-0 space-y-4">
          {signup && <div>
            <label htmlFor="display-name" className="block text-sm font-semibold">ชื่อที่แสดง</label>
            <input id="display-name" name="display_name" autoComplete="nickname" required value={displayName}
              onChange={(event) => setDisplayName(event.target.value)} className={inputClass} />
          </div>}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">อีเมล</label>
            <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold">รหัสผ่าน</label>
            <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"}
              required minLength={signup ? 6 : undefined} value={password}
              onChange={(event) => setPassword(event.target.value)} className={inputClass}
              aria-describedby={signup ? "password-help" : undefined} />
            {signup && <p id="password-help" className="mt-2 text-sm text-slate-500">อย่างน้อย 6 ตัวอักษร</p>}
          </div>
          <button type="submit" className="w-full rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {pending ? "กำลังดำเนินการ…" : signup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </fieldset>
        <div aria-live="polite" aria-atomic="true">
          {state.message && state.mode === mode && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p>}
        </div>
      </form>
    </section>
  );
}

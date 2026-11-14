import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/lib/auth/flow";
import { AccountHeader } from "@/app/account-header";

// ตรวจสถานะใหม่ทุกครั้งที่เปิดหน้า ไม่จำผลไว้ตอน build
export const dynamic = "force-dynamic";

type Status = { ok: boolean; title: string; detail: string };

// ตรวจว่าเชื่อม Supabase ได้หรือยัง เพื่อให้ผู้เรียนรู้ว่าตั้งค่าครบแล้ว
async function checkSupabase(): Promise<Status> {
  if (!hasSupabaseEnv) {
    return {
      ok: false,
      title: "ยังไม่ได้ใส่ค่าใน .env.local",
      detail:
        "คัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่ Project URL และ Publishable key จาก Supabase จากนั้นหยุดแล้วรัน npm run dev ใหม่",
    };
  }

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (!data.user && (!authError || authError.name === "AuthSessionMissingError")) {
    return {
      ok: true,
      title: "หน้าสมัครและเข้าสู่ระบบพร้อมใช้งาน",
      detail: "เข้าสู่ระบบเพื่อตรวจข้อมูลบัญชีของคุณ ข้อมูลส่วนบุคคลไม่เปิดให้ผู้ที่ยังไม่ล็อกอินอ่าน",
    };
  }
  if (authError) return { ok: false, title: "ตรวจสถานะบัญชีไม่สำเร็จ", detail: "กรุณาลองใหม่หรือตรวจการเชื่อมต่อ" };
  const { error } = await supabase
    .from("profiles")
    .select("user_id", { count: "exact", head: true });

  if (!error) {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ และพบตาราง profiles แล้ว",
      detail: "พร้อมทำ user story ถัดไป",
    };
  }

  const missingTable =
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table|does not exist/i.test(error.message);

  if (missingTable) {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ",
      detail:
        "ยังไม่มีตาราง profiles กรุณาทำขั้นตอนติดตั้งฐานข้อมูล US-1 ตาม docs/testing-us1.md ก่อนสมัครสมาชิก",
    };
  }

  return {
    ok: false,
    title: "เชื่อม Supabase ไม่สำเร็จ",
    detail: "ตรวจการเชื่อมต่อและการตั้งค่าฐานข้อมูล หากเพิ่งติดตั้ง US-1 ให้อ่านขั้นตอนใน docs/testing-us1.md",
  };
}

export default async function Home() {
  const status = await checkSupabase();
  const account = hasSupabaseEnv ? await getAccount(await createClient()) : null;

  return (
    <>
    {account?.kind === "authenticated" && <AccountHeader displayName={account.displayName} />}
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">
        โปรเจกต์ตั้งต้นสำหรับ workshop สร้างระบบด้วย Codex
      </p>
      <nav className="mt-5 flex flex-wrap gap-4" aria-label="เข้าใช้งาน">
        <Link href="/login" className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white">สมัคร / เข้าสู่ระบบ</Link>
        <Link href="/team" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-blue-900">ทีมของคุณ</Link>
      </nav>

      <section
        className={`mt-8 rounded-2xl border p-6 ${
          status.ok
            ? "border-emerald-300 bg-emerald-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-sm font-semibold">
          {status.ok ? "สถานะ: พร้อม" : "สถานะ: ยังไม่พร้อม"}
        </p>
        <h2 className="mt-1 text-xl font-bold">{status.title}</h2>
        <p className="mt-2 text-slate-700">{status.detail}</p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-blue-900">ขั้นต่อไป</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
          <li>ติดตั้งฐานข้อมูลตาม docs/testing-us1.md</li>
          <li>เปิดหน้าสมัคร / เข้าสู่ระบบ แล้วทดสอบ AC-1.1 ถึง AC-1.5</li>
          <li>เมื่อตรวจ US-1 แล้ว จึงเริ่มระบบทีม US-2</li>
        </ol>
      </section>
    </main>
    </>
  );
}

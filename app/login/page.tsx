import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (hasSupabaseEnv) {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (!error && data.user) redirect("/team");
  }
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Link href="/" className="text-sm text-blue-800 underline underline-offset-4">กลับหน้าแรก</Link>
      <h1 className="mt-6 text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">พื้นที่ทำงานร่วมกันของทีมคุณ</p>
      {!hasSupabaseEnv && <p role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">ระบบบัญชียังไม่พร้อมใช้งาน กรุณาแจ้งผู้ดูแล</p>}
      <LoginForm available={hasSupabaseEnv} />
    </main>
  );
}

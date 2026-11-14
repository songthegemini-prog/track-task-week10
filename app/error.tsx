"use client";

import { SignOutButton } from "./sign-out-button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto w-full max-w-lg px-4 py-12">
    <h1 className="text-2xl font-bold text-blue-900">โหลดข้อมูลไม่สำเร็จ</h1>
    <p role="alert" className="mt-3 text-slate-600">กรุณาลองใหม่ หากยังพบปัญหาให้แจ้งผู้ดูแลเพื่อตรวจการเชื่อมต่อและข้อมูลบัญชี</p>
    <div className="mt-5 flex flex-wrap items-start gap-3">
      <button onClick={reset} className="rounded-lg bg-blue-900 px-4 py-2 text-white">ลองใหม่</button>
      <SignOutButton />
    </div>
  </main>;
}

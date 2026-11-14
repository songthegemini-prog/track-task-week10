import Link from "next/link";
import { loadTeam } from "@/lib/team";
import { WorkForm } from "@/app/work-forms";
export default async function TeamPage() {
    const data = await loadTeam();
    return <>
    <h1 className="mt-2 text-2xl font-bold text-blue-900">ทีมของคุณ</h1>
    {!data ? <div className="mt-6 grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-bold">สร้างทีม</h2><WorkForm kind="create-team"/></section>
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-bold">เข้าร่วมทีม</h2><WorkForm kind="join-team"/></section>
    </div> : <section className="mt-6 min-w-0 rounded-xl border bg-white p-5">
      <h2 className="break-words text-xl font-bold">{data.team.name}</h2>
      <p className="mt-3">รหัสเชิญ: <strong className="font-mono text-lg tracking-widest">{data.team.invite_code}</strong></p>
      <p className="mt-1 text-sm text-slate-600">ส่งรหัสนี้ให้เพื่อนเพื่อเข้าร่วมทีม</p>
      <h3 className="mt-6 font-bold">สมาชิกทีม</h3>
      <ul className="mt-3 divide-y">{data.members.map(m => <li key={m.user_id} className="min-w-0 py-3"><p className="break-words font-semibold">{m.display_name} <span className="text-sm text-slate-500">({m.user_id === data.team.created_by ? "หัวหน้า" : "สมาชิก"})</span></p><p className="break-all text-sm text-slate-600">{m.email}</p></li>)}</ul>
      <Link href="/tasks" className="mt-5 inline-block rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white">ดูงานของทีม</Link>
    </section>}
  </>;
}

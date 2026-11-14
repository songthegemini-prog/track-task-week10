"use client";
import { useEffect, useState } from "react";
import { isOverdue, statuses, thaiDate } from "@/lib/task-format";
import type { Member, Task } from "@/lib/team";
import { WorkForm } from "@/app/work-forms";
export function TaskBoard({ tasks, members, isLead, userId }: {
    tasks: Task[];
    members: Member[];
    isLead: boolean;
    userId: string;
}) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
    if (!tasks.length)
        return <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6">ยังไม่มีงานในทีม</p>;
    return <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-3">{Object.entries(statuses).map(([status, label]) => <section key={status} className="min-w-0 rounded-xl bg-slate-100 p-3">
 <h2 className="font-bold text-blue-900">{label} ({tasks.filter(t => t.status === status).length})</h2>
 <div className="mt-3 space-y-3">{tasks.filter(t => t.status === status).map(task => <article key={task.id} className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
 <h3 className="break-words font-bold">{task.title}</h3>
 <p className="break-words text-sm">ผู้รับงาน: {members.find(m => m.user_id === task.assignee_id)?.display_name || "ไม่พบข้อมูลผู้รับงาน"}</p>
 <p className="text-sm">กำหนดส่ง: {thaiDate(task.due_date)}</p>
 {isOverdue(task.due_date, task.status, now) && <p className="inline-block rounded bg-red-100 px-2 py-1 text-sm font-semibold text-red-800">เลยกำหนด</p>}
 {task.description && <details><summary className="cursor-pointer text-sm text-blue-800">รายละเอียด</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm">{task.description}</p></details>}
 {(isLead || task.assignee_id === userId) && <WorkForm key={task.id + "-" + task.status} kind="status" task={task}/>}
 </article>)}{!tasks.some(t => t.status === status) && <p className="text-sm text-slate-500">ไม่มีงานในสถานะนี้</p>}</div>
 </section>)}</div>;
}

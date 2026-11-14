"use client";
import { useActionState, useState } from "react";
import { workAction } from "@/app/work-actions";
import { statuses } from "@/lib/task-format";
import type { Member, Task } from "@/lib/team";
const input = "mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600";
export function WorkForm({ kind, members = [], task }: {
    kind: "create-team" | "join-team" | "create-task" | "status";
    members?: Member[];
    task?: Task;
}) {
    const [state, action, pending] = useActionState(workAction, { message: "" });
    const [name, setName] = useState(""), [code, setCode] = useState(""), [title, setTitle] = useState(""), [description, setDescription] = useState(""), [due, setDue] = useState(""), [assignee, setAssignee] = useState("");
    const [status, setStatus] = useState(task?.status || "todo");
    const label = kind === "create-team" ? "สร้างทีม" : kind === "join-team" ? "เข้าร่วมทีม" : kind === "create-task" ? "สร้างงาน" : "บันทึกสถานะ";
    return <form action={action} className="min-w-0 space-y-3" aria-busy={pending}>
 <input type="hidden" name="kind" value={kind}/>{task && <input type="hidden" name="task_id" value={task.id}/>}
 <fieldset disabled={pending} className="min-w-0 space-y-3">
 {kind === "create-team" && <label className="block">ชื่อทีม<input name="name" value={name} onChange={e => setName(e.target.value)} className={input} required/></label>}
 {kind === "join-team" && <label className="block">รหัสเชิญ<input name="invite_code" value={code} onChange={e => setCode(e.target.value)} className={input + " uppercase"} autoCapitalize="characters" autoComplete="off" maxLength={6} required/></label>}
 {kind === "create-task" && <>
 <label className="block">ชื่องาน<input name="title" value={title} onChange={e => setTitle(e.target.value)} className={input} required/></label>
 <label className="block">รายละเอียด (ไม่บังคับ)<textarea name="description" value={description} onChange={e => setDescription(e.target.value)} className={input} rows={3}/></label>
 <label className="block">วันกำหนดส่ง (ไม่บังคับ)<input type="date" name="due_date" value={due} onChange={e => setDue(e.target.value)} className={input}/></label>
 <label className="block">ผู้รับงาน<select name="assignee_id" value={assignee} onChange={e => setAssignee(e.target.value)} className={input} required><option value="">เลือกสมาชิกทีม</option>{members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
 </>}
 {kind === "status" && <label className="block text-sm">สถานะงาน<select name="status" value={status} onChange={e => setStatus(e.target.value as typeof status)} className={input}>{Object.entries(statuses).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>}
 <button className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "กำลังบันทึก…" : label}</button>
 </fieldset>
 <p aria-live="polite" role={state.message && !state.success ? "alert" : "status"} className={"break-words text-sm " + (state.success ? "text-emerald-700" : "text-red-700")}>{state.message}</p>
 </form>;
}

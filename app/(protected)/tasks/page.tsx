import { redirect } from "next/navigation";
import Link from "next/link";
import { loadTeam, type Task } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import { WorkForm } from "@/app/work-forms";
import { TaskBoard } from "@/app/task-board";
export default async function TasksPage() {
    const data = await loadTeam();
    if (!data)
        redirect("/team");
    const client = await createClient();
    const { data: tasks, error } = await client.from("tasks").select("id,title,description,due_date,assignee_id,status").eq("team_id", data.team.id).order("created_at").order("id");
    if (error)
        throw new Error("โหลดงานไม่สำเร็จ");
    return <>
    <Link href="/team" className="text-sm text-blue-800 underline">กลับหน้าทีม</Link>
    <h1 className="mt-3 break-words text-2xl font-bold text-blue-900">งานของทีม {data.team.name}</h1>
    {data.isLead && <details className="mt-5 rounded-xl border bg-white p-5" open><summary className="mb-4 cursor-pointer font-bold">สร้างงานและมอบหมาย</summary><WorkForm kind="create-task" members={data.members}/></details>}
    <TaskBoard tasks={(tasks || []) as Task[]} members={data.members} isLead={data.isLead} userId={data.userId}/>
  </>;
}

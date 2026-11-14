"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { statuses } from "@/lib/task-format";
export type WorkState = {
    message: string;
    success?: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function workAction(_previous: WorkState, form: FormData): Promise<WorkState> {
    await requireAccount();
    const v = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
    const kind = v("kind"), client = await createClient();
    try {
        let error: {
            message: string;
            code?: string;
        } | null = null;
        if (kind === "create-team") {
            if (!v("name"))
                return { message: "กรุณากรอกชื่อทีม" };
            ({ error } = await client.rpc("create_team", { team_name: v("name") }));
        }
        else if (kind === "join-team") {
            ({ error } = await client.rpc("join_team", { invite_code: v("invite_code") }));
        }
        else if (kind === "create-task") {
            if (!v("title"))
                return { message: "กรุณากรอกชื่องาน" };
            if (!uuid.test(v("assignee_id")))
                return { message: "กรุณาเลือกผู้รับงานจากสมาชิกทีม" };
            const due = v("due_date");
            if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due + "T12:00:00Z")) || new Date(due + "T12:00:00Z").toISOString().slice(0, 10) !== due))
                return { message: "กรุณาระบุวันกำหนดส่งให้ถูกต้อง" };
            ({ error } = await client.rpc("create_task", { title: v("title"), description: v("description") || null, due_date: due || null, assignee_id: v("assignee_id") }));
        }
        else if (kind === "status") {
            if (!uuid.test(v("task_id")) || !Object.hasOwn(statuses, v("status")))
                return { message: "สถานะงานไม่ถูกต้อง" };
            const result = await client.from("tasks").update({ status: v("status") }).eq("id", v("task_id")).select("id");
            error = result.error;
            if (!error && !result.data?.length)
                return { message: "ไม่สามารถเปลี่ยนสถานะงานนี้ได้" };
        }
        else
            return { message: "คำขอไม่ถูกต้อง" };
        if (error) {
            const messages: Record<string, string> = { ALREADY_IN_TEAM: "คุณมีทีมอยู่แล้ว", TEAM_NAME_REQUIRED: "กรุณากรอกชื่อทีม", TEAM_NOT_FOUND: "ไม่พบทีมจากรหัสนี้", LEAD_REQUIRED: "เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้", ASSIGNEE_NOT_MEMBER: "เลือกผู้รับงานได้เฉพาะสมาชิกในทีม", TASK_TITLE_REQUIRED: "กรุณากรอกชื่องาน", ONLY_STATUS_ALLOWED: "คุณแก้ได้เฉพาะสถานะของงานนี้" };
            return { message: messages[error.message] || (error.code === "23503" ? "เลือกผู้รับงานได้เฉพาะสมาชิกในทีม" : "บันทึกไม่สำเร็จ กรุณาลองใหม่") };
        }
    }
    catch {
        return { message: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" };
    }
    revalidatePath("/team");
    revalidatePath("/tasks");
    return { message: kind === "create-task" ? "สร้างงานสำเร็จ" : kind === "status" ? "บันทึกสถานะแล้ว" : kind === "create-team" ? "สร้างทีมสำเร็จ" : "เข้าร่วมทีมสำเร็จ", success: true };
}

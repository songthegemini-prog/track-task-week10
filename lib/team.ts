import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/server";
import type { TaskStatus } from "@/lib/task-format";
export type Member = {
    user_id: string;
    display_name: string;
    email: string;
};
export type Task = {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    assignee_id: string;
    status: TaskStatus;
};
export async function loadTeam() {
    const account = await requireAccount(), client = await createClient();
    const { data: id, error } = await client.rpc("current_team_id");
    if (error)
        throw new Error("โหลดข้อมูลทีมไม่สำเร็จ");
    if (!id)
        return null;
    const { data: team, error: te } = await client.from("teams").select("id,name,invite_code,created_by").eq("id", id).single();
    const { data: membership, error: me } = await client.from("team_members").select("user_id").eq("team_id", id);
    if (te || me || !team || !membership?.length)
        throw new Error("โหลดทีมไม่สำเร็จ");
    const { data: members, error: pe } = await client.from("profiles").select("user_id,display_name,email").in("user_id", membership.map(m => m.user_id)).order("display_name");
    if (pe || !members || members.length !== membership.length)
        throw new Error("โหลดสมาชิกไม่สำเร็จ");
    return { team, members: members as Member[], isLead: team.created_by === account.userId, userId: account.userId };
}

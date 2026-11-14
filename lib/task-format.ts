export const statuses = { todo: "ยังไม่เริ่ม", in_progress: "กำลังทำ", done: "เสร็จแล้ว" } as const;
export type TaskStatus = keyof typeof statuses;
export function isOverdue(due: string | null, status: string, now = new Date()) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return Boolean(due && status !== "done" && due < today);
}
export function thaiDate(due: string | null) {
    return due ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${due}T12:00:00+07:00`)) : "ไม่มีกำหนด";
}

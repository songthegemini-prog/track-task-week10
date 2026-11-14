"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticate, signOutAccount, type AuthFormState } from "@/lib/auth/flow";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function authenticateAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const rawMode = form.get("mode");
  const mode = typeof rawMode === "string" ? rawMode : "";
  if (!hasSupabaseEnv) return { mode, message: "ระบบบัญชียังไม่พร้อมใช้งาน กรุณาแจ้งผู้ดูแล" };
  const result = await authenticate(await createClient(), form);
  if (!result.ok) return { mode, message: result.message };
  revalidatePath("/", "layout");
  redirect("/team");
}

export async function signOutAction(): Promise<AuthFormState> {
  if (hasSupabaseEnv) {
    const message = await signOutAccount(await createClient());
    if (message) return { message };
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

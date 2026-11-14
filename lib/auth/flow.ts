import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthFormState = { message: string; mode?: string };
type AuthResult = { ok: true } | { ok: false; message: string };
export type Account =
  | { kind: "anonymous" }
  | { kind: "error"; message: string }
  | { kind: "authenticated"; userId: string; displayName: string; email: string };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function authenticate(client: SupabaseClient, form: FormData): Promise<AuthResult> {
  const mode = text(form, "mode");
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const displayName = text(form, "display_name").trim();
  if (mode !== "login" && mode !== "signup") return { ok: false, message: "คำขอไม่ถูกต้อง กรุณาลองใหม่" };
  if (mode === "signup" && !displayName) return { ok: false, message: "กรุณากรอกชื่อที่แสดง" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "กรุณากรอกอีเมลให้ถูกต้อง" };
  if (!password) return { ok: false, message: "กรุณากรอกรหัสผ่าน" };
  if (mode === "signup" && password.length < 6) return { ok: false, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  try {
    const { data, error } = mode === "signup"
      ? await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : await client.auth.signInWithPassword({ email, password });
    if (error) {
      if (mode === "login" && error.code === "invalid_credentials") return { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
      if (error.code === "email_not_confirmed") return { ok: false, message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" };
      if (error.status === 429) return { ok: false, message: "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" };
      return { ok: false, message: mode === "signup" ? "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจข้อมูลหรือลองเข้าสู่ระบบหากมีบัญชีแล้ว" : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" };
    }
    if (!data.session) return { ok: false, message: "สมัครแล้วแต่ยังต้องยืนยันอีเมล กรุณาตรวจกล่องอีเมลก่อนเข้าสู่ระบบ" };
    return { ok: true };
  } catch {
    return { ok: false, message: "เชื่อมต่อระบบบัญชีไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function getAccount(client: SupabaseClient): Promise<Account> {
  try {
    // getUser verifies identity with Auth; cookie contents alone are not trusted.
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError" || [400, 401, 403].includes(error.status ?? 0)) return { kind: "anonymous" };
      return { kind: "error", message: "ตรวจสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" };
    }
    if (!data.user) return { kind: "anonymous" };
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("user_id,display_name,email").eq("user_id", data.user.id).single();
    if (profileError || !profile?.display_name) return { kind: "error", message: "โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่ หากยังพบปัญหาให้แจ้งผู้ดูแล" };
    return { kind: "authenticated", userId: data.user.id, displayName: profile.display_name, email: profile.email };
  } catch {
    return { kind: "error", message: "เชื่อมต่อระบบบัญชีไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function signOutAccount(client: SupabaseClient): Promise<string | null> {
  try {
    const { error: userError } = await client.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError" && ![400, 401, 403].includes(userError.status ?? 0)) {
      return "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่";
    }
    const { error } = await client.auth.signOut();
    return error ? "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่" : null;
  } catch {
    return "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่";
  }
}

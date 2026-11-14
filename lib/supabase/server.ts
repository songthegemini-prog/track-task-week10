import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

// ใช้ใน Server Component, Server Action และ Route Handler
// สร้างใหม่ทุกครั้งที่ใช้ ห้ามเก็บไว้ใช้ร่วมกันข้ามคำขอ
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // เรียกจาก Server Component ซึ่งตั้ง cookie ไม่ได้ ไม่เป็นไร
          // เพราะ proxy.ts รีเฟรช session ให้ทุกคำขออยู่แล้ว
        }
      },
    },
  });
}

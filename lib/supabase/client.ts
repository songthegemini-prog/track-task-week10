import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

// ใช้ในไฟล์ที่ขึ้นต้นด้วย "use client" (โค้ดที่ทำงานในเบราว์เซอร์)
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

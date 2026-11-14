// อ่านค่าที่ใส่ไว้ใน .env.local (บนเครื่อง) หรือ Environment Variables (บน Vercel)
// ทั้งสองค่านี้เปิดเผยได้ เพราะข้อมูลถูกป้องกันด้วย RLS ในฐานข้อมูล
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);

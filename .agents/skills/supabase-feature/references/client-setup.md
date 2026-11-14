# ตั้งค่า Supabase ใน Next.js (App Router)

ใช้เป็นแนวทางเท่านั้น ชื่อฟังก์ชันและไฟล์อาจต่างไปตามรุ่น ให้ตรวจกับเอกสาร Supabase "Server-Side Auth for Next.js" ของรุ่นที่ติดตั้ง

## แพ็กเกจ

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## env

`.env.local` (ห้าม commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# ใส่เฉพาะเมื่อมีโค้ดฝั่ง server ที่จำเป็นต้องใช้จริง
SUPABASE_SECRET_KEY=sb_secret_...
```

`.env.example` (commit ได้) มีชื่อเดียวกันแต่ค่าเป็น placeholder

`.gitignore` ต้องมี:

```text
.env*.local
```

## โครงไฟล์ที่แนะนำ

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/supabase/client.ts` | `createBrowserClient(url, publishableKey)` สำหรับ Client Component |
| `lib/supabase/server.ts` | `createServerClient(url, publishableKey, { cookies })` สำหรับ Server Component, Server Action และ Route Handler (ผูก session ผู้ใช้ ทำให้ RLS ทำงาน) |
| ไฟล์ middleware/proxy ของ Next.js | รีเฟรช session ของ Supabase ทุก request ตามเอกสารของรุ่นที่ใช้ |

## Auth

- เปิด Email provider ใน Supabase → Authentication
- ตั้ง Site URL และ Redirect URLs ใน Authentication → URL Configuration ให้มีทั้ง `http://localhost:3000` และโดเมนบน Vercel
- ฝั่ง server ให้ตรวจผู้ใช้ด้วยฟังก์ชันที่ยืนยัน token กับ Supabase ก่อนทำงานที่ต้องใช้สิทธิ์

---
name: project-setup
description: "สร้างเว็บตั้งต้น Next.js (App Router, TypeScript, Tailwind) ที่เชื่อม Supabase ไว้แล้ว ในโฟลเดอร์ที่มีแค่เอกสาร (docs/, AGENTS.md, .env.example) พร้อมหน้าแรกที่บอกสถานะการเชื่อมต่อเป็นกล่องสีเขียวหรือเหลือง ใช้เมื่อผู้ใช้ขอสร้างโปรเจกต์ตั้งต้น ตั้งค่าโปรเจกต์ใหม่ หรือโฟลเดอร์ยังไม่มี package.json ไม่ใช้กับโปรเจกต์ที่มี package.json แล้ว หรือการเขียนฟีเจอร์ (ใช้ $supabase-feature)"
---

# Project Setup

สร้างเว็บเปล่าที่เชื่อม Supabase ได้ เพื่อให้ผู้ใช้เห็นกล่องสีเขียวก่อนเริ่มออกแบบและสร้างฟีเจอร์ **ยังไม่สร้างตาราง หน้า หรือฟีเจอร์ใด ๆ** งานนี้มีแค่โครงเว็บและการเชื่อมต่อ

## คุยกับผู้ใช้ที่ไม่ใช่โปรแกรมเมอร์

- ตอบเป็นภาษาไทยที่เข้าใจง่าย อธิบายศัพท์เทคนิคสั้น ๆ ในวงเล็บทุกครั้งที่ใช้ครั้งแรก
- ก่อนรันคำสั่งที่ต้องใช้อินเทอร์เน็ต (npx, npm install) บอกก่อนว่าจะดาวน์โหลดอะไร และผู้ใช้ต้องกดอนุญาต
- สรุปเป็นภาษาคนว่าสร้างไฟล์อะไรเพื่ออะไร ไม่ต้องให้ผู้ใช้อ่านโค้ด
- จบงานด้วยหัวข้อ **"สิ่งที่คุณต้องทำเอง"** เป็นข้อที่คลิกหรือพิมพ์ตามได้ทันที

## 0. ตรวจก่อนเริ่ม

- ถ้ามี `package.json` อยู่แล้ว ให้**หยุด** แจ้งว่าโปรเจกต์ถูกสร้างไว้แล้ว และแนะนำให้รัน `npm install` กับ `npm run dev` แทน
- ตรวจ `node -v` (ต้องเป็นรุ่น 20.9 ขึ้นไป) และ `npm -v` ถ้าไม่มีหรือรุ่นเก่า ให้บอกผู้ใช้ไปติดตั้ง Node.js รุ่น LTS แล้วเปิด VS Code ใหม่
- ไฟล์ที่มีอยู่แล้วและ**ห้ามเขียนทับ**: `docs/`, `AGENTS.md`, `README.md`, `.env.example`, `.agents/`, `.git/`
- ห้ามอ่านหรือแสดงค่าใน `.env.local` และห้ามขอให้ผู้ใช้วาง key ในแชท

## 1. สร้างโครง Next.js ในโฟลเดอร์ชั่วคราว

`create-next-app` ไม่ยอมสร้างในโฟลเดอร์ที่มีไฟล์อยู่แล้ว จึงสร้างในโฟลเดอร์ชั่วคราวก่อน แล้วย้ายขึ้นมา

```bash
npx create-next-app@latest setup-tmp --ts --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --yes
```

ย้ายทุกไฟล์ (รวมไฟล์ที่ขึ้นต้นด้วยจุด) จาก `setup-tmp/` มาที่โฟลเดอร์หลัก ยกเว้น
- `README.md` → ไม่ย้าย เก็บของเดิมไว้
- `AGENTS.md` / `CLAUDE.md` ที่ Next.js สร้าง → ไม่ย้าย เก็บ `AGENTS.md` เดิมไว้ (`next dev` จะเติมส่วนของ Next.js ให้เอง)
- `.gitignore` → รวมกับของเดิม ต้องมี `.env*` และ `!.env.example` และ `setup-tmp/`

แล้วลบ `setup-tmp/` และปรับ 2 จุด
- `package.json` → เปลี่ยน `"name": "setup-tmp"` เป็น `"name": "task-app"`
- `next.config.ts` → **ลบบรรทัด `cacheComponents: true` และ `partialPrefetching: true`** (ค่าเริ่มต้นของ Next.js 16 เปิดไว้ ทำให้หน้าที่ใช้การล็อกอินและหน้าตรวจสถานะ build ไม่ผ่าน) คงส่วนอื่นไว้ แล้วเติมคอมเมนต์ว่าปิดไว้โดยตั้งใจ

## 2. ติดตั้งและเชื่อม Supabase

```bash
npm install
npm install @supabase/supabase-js @supabase/ssr
```

สร้างไฟล์ตาม [references/starter-files.md](references/starter-files.md)

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/supabase/env.ts` | อ่าน `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `lib/supabase/client.ts` | ตัวเชื่อม Supabase ฝั่งเบราว์เซอร์ |
| `lib/supabase/server.ts` | ตัวเชื่อม Supabase ฝั่ง server (ผูก session ผู้ใช้ ทำให้ RLS ทำงาน) |
| `proxy.ts` | รีเฟรช session การล็อกอินทุกคำขอ (Next.js 16 ใช้ proxy แทน middleware) |
| `app/page.tsx` | หน้าตรวจสถานะ: กล่องสีเขียว "เชื่อม Supabase สำเร็จ" หรือกล่องสีเหลืองพร้อมวิธีแก้ |
| `app/layout.tsx` | ฟอนต์ Noto Sans Thai, `lang="th"`, ชื่อเว็บ "ระบบติดตามงานทีม" |
| `supabase/migrations/.gitkeep` | โฟลเดอร์เก็บไฟล์ SQL ในขั้นต่อไป |

กติกา
- ใช้แค่ publishable key **ห้ามใช้ secret key** และห้ามเพิ่มตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ที่เป็นรหัสลับ
- หน้าแรกต้องเป็น dynamic (`export const dynamic = "force-dynamic"`) เพื่อตรวจสถานะใหม่ทุกครั้งที่เปิด
- อย่าเปิด Cache Components ใน `next.config.ts` (ถ้า build แจ้ง error เกี่ยวกับ `dynamic` หรือ `cacheComponents` ให้กลับไปตรวจข้อนี้)
- ยังไม่สร้างตาราง ไม่เขียน SQL และไม่ทำ user story ใด ๆ

## 3. ตรวจผล

- `npm run lint` และ `npm run build` ต้องผ่าน (ยังไม่มี `.env.local` ก็ build ผ่าน และหน้าแรกจะแสดงกล่องสีเหลือง)
- `git status` ต้องไม่เห็น `node_modules/`, `.next/` หรือ `.env.local`

## 4. สิ่งที่คุณต้องทำเอง (เขียนให้ผู้ใช้ตามนี้)

1. คัดลอกไฟล์ `.env.example` → เปลี่ยนชื่อเป็น `.env.local`
2. Supabase → Project Settings → **API Keys** → คัดลอก **Publishable key** วางใน `.env.local`
3. ปุ่ม **Connect** บนหน้าโปรเจกต์ → คัดลอก **Project URL** วางใน `.env.local` → บันทึก
4. Terminal พิมพ์ `npm run dev` → เปิด http://localhost:3000 → ต้องเห็นกล่องสีเขียว
5. ถ้าเห็นกล่องสีเหลือง อ่านข้อความในกล่องแล้วแก้ตามนั้น (ส่วนใหญ่คือวางค่าผิดช่อง หรือยังไม่ได้รัน `npm run dev` ใหม่หลังแก้ไฟล์)
6. เห็นกล่องสีเขียวแล้ว → Source Control → พิมพ์ "สร้างโปรเจกต์ตั้งต้น" → **Commit** → **Sync Changes**

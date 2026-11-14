---
name: security-check
description: "ตรวจความปลอดภัยของเว็บแอป Next.js + Supabase ก่อนเปิดให้คนอื่นใช้ ครอบคลุม RLS ทุกตาราง, policy ที่กว้างเกินไป, การใช้ publishable/secret key, env vars, .gitignore, key ที่หลุดในโค้ดหรือ git history และ function แบบ security definer รายงานเป็นตารางพร้อมระดับความเสี่ยง ใช้เมื่อผู้ใช้ขอตรวจความปลอดภัย ตรวจก่อน deploy หรือสงสัยว่าข้อมูลรั่ว โดยค่าเริ่มต้นรายงานอย่างเดียว ไม่แก้"
---

# Security Check

หาจุดที่ทำให้ข้อมูลรั่วหรือถูกแก้โดยคนที่ไม่มีสิทธิ์ หลักคิดคือ**โค้ดฝั่ง browser ทุกบรรทัดใครก็อ่านได้** ความปลอดภัยจึงต้องอยู่ที่ฐานข้อมูลและ server


## คุยกับผู้ใช้ที่ไม่ใช่โปรแกรมเมอร์

- ตอบเป็นภาษาไทยที่เข้าใจง่าย อธิบายศัพท์เทคนิคสั้น ๆ ในวงเล็บทุกครั้งที่ใช้ครั้งแรก
- สรุปการเปลี่ยนแปลงเป็นภาษาคน ไม่ต้องให้ผู้ใช้อ่านโค้ดทุกบรรทัด
- จบงานด้วยหัวข้อ **"สิ่งที่คุณต้องทำเอง"** เป็นข้อที่คลิกหรือพิมพ์ตามได้ทันที (เมนูไหน ปุ่มไหน วางอะไร)

## ขอบเขตและกติกา

- ค่าเริ่มต้นคือ**รายงานอย่างเดียว** แก้เมื่อผู้ใช้สั่งเท่านั้น และแก้ทีละประเด็น
- **ห้ามแสดงค่า key หรือ secret ในคำตอบ** ให้บอกแค่ชื่อไฟล์ บรรทัด และชนิดของ key
- ห้ามรัน SQL กับฐานข้อมูลของผู้ใช้ ถ้าต้องดูสถานะ RLS จริง ให้เขียน query ให้ผู้ใช้รันเอง (ดูท้ายไฟล์)

## รายการตรวจ

1. **RLS:** ทุก `create table` ใน `supabase/migrations/` มี `enable row level security` ตามมา และมี policy ครบตาม `docs/design.md`
2. **Policy กว้างเกินไป:** `using (true)` หรือ `with check (true)` บนข้อมูลรายบุคคล, policy ที่ไม่ระบุ `to`, update ที่ไม่มี `with check`, เงื่อนไขที่ไม่ผูกกับ `auth.uid()`
3. **Security definer:** function ที่ไม่มี `set search_path = ''`, ไม่ตรวจ `auth.uid()` ทั้งที่ควรตรวจ หรือคืนข้อมูลเกินความจำเป็น
4. **Key ในโค้ด:** ค้นหา `sb_secret_`, `service_role`, `GMAIL_APP_PASSWORD=` ที่มีค่าจริง, `eyJ` (JWT) และรูปแบบ key อื่นในโค้ดและไฟล์ที่ commit แล้ว รวม `git log -p` ถ้าทำได้
5. **Env vars:** ตัวแปรที่ขึ้นต้น `NEXT_PUBLIC_` ต้องเป็นค่าที่เปิดเผยได้เท่านั้น, `SUPABASE_SECRET_KEY`, `GMAIL_USER` และ `GMAIL_APP_PASSWORD` ต้องถูกใช้ในโค้ดฝั่ง server เท่านั้น (ไม่อยู่ในไฟล์ที่มี `"use client"` หรือ import เข้า Client Component)
6. **.gitignore:** กันไฟล์ `.env.local` อยู่ (เช่น `.env*` หรือ `.env*.local`) และไม่มีไฟล์ env จริงถูก track
7. **ฝั่ง server:** Server Action / Route Handler ตรวจผู้ใช้จาก session ไม่เชื่อ `user_id` หรือ role ที่ส่งมาจาก client
8. **ข้อความผิดพลาด:** ไม่ส่งรายละเอียดภายใน, stack trace หรือค่าลับออกไปให้ผู้ใช้

## รายงาน

| # | ระดับ (สูง / กลาง / ต่ำ) | ประเด็น (ภาษาง่าย) | ตำแหน่ง | ผลกระทบต่อผู้ใช้ | วิธีแก้ที่แนะนำ |
|---|---|---|---|---|---|

- เรียงจากระดับสูงไปต่ำ ถ้าไม่พบปัญหาในหัวข้อใด ให้บอกว่าตรวจแล้วไม่พบ
- App Password ของ Gmail หลุด: แนะนำให้ลบ App Password นั้นที่ myaccount.google.com/apppasswords แล้วสร้างใหม่
- secret key หลุดใน git: แนะนำให้สร้าง key ใหม่และยกเลิก key เดิมใน Supabase → Project Settings → API Keys
- ปิดท้ายด้วยการทดสอบที่ผู้ใช้ควรทำเอง: ทดสอบด้วย 2 บัญชี และเปิด Security Advisor ใน Supabase Dashboard

## Query สำหรับให้ผู้ใช้รันใน SQL Editor

```sql
-- ตารางใน public ที่ยังไม่เปิด RLS
select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- policy ทั้งหมด
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename;
```

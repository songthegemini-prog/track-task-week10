---
name: vercel-deploy
description: "เตรียมและนำเว็บแอป Next.js ที่ใช้ Supabase ขึ้น Vercel ผ่าน GitHub ในขั้น Deployment ของ SDLC ตรวจ build, env vars, .gitignore, Redirect URLs ของ Supabase Auth และการทดสอบหลัง deploy ใช้เมื่อผู้ใช้ขอ deploy, ขึ้น production, ตั้งค่า Vercel, หรือเว็บใช้ได้บนเครื่องแต่พังบน Vercel ไม่ใช้กับการเขียนฟีเจอร์ใหม่"
---

# Vercel Deploy

พาผู้ใช้จาก "รันได้บนเครื่อง" ไปเป็น "มี URL ที่ใช้งานได้จริง" อย่างปลอดภัย ขั้นที่ต้องใช้บัญชีของผู้ใช้ เช่น กด Import, ใส่ค่า secret หรือกด Deploy ให้**ผู้ใช้เป็นคนทำ** Codex เตรียมโค้ดและบอกขั้นตอน


## คุยกับผู้ใช้ที่ไม่ใช่โปรแกรมเมอร์

- ตอบเป็นภาษาไทยที่เข้าใจง่าย อธิบายศัพท์เทคนิคสั้น ๆ ในวงเล็บทุกครั้งที่ใช้ครั้งแรก
- สรุปการเปลี่ยนแปลงเป็นภาษาคน ไม่ต้องให้ผู้ใช้อ่านโค้ดทุกบรรทัด
- จบงานด้วยหัวข้อ **"สิ่งที่คุณต้องทำเอง"** เป็นข้อที่คลิกหรือพิมพ์ตามได้ทันที (เมนูไหน ปุ่มไหน วางอะไร)

## 1. ตรวจก่อน deploy (Codex ทำเองได้)

- `npm run build` ผ่านบนเครื่อง ถ้าไม่ผ่าน ให้แก้ก่อน
- `.gitignore` กันไฟล์ `.env.local` อยู่ (เช่นมี `.env*` หรือ `.env*.local`) และไม่มีไฟล์ env จริงถูก track (`git ls-files | grep -i env` ต้องเห็นแค่ `.env.example`)
- ค้นในโค้ดและประวัติ git ว่าไม่มี `sb_secret_`, `service_role` หรือ key อื่นฝังอยู่ ถ้าพบใน git history ให้แจ้งผู้ใช้ว่าต้อง**สร้าง key ใหม่และยกเลิก key เดิม** การลบออกจากโค้ดอย่างเดียวไม่พอ
- มี `.env.example` ที่ระบุชื่อตัวแปรทั้งหมดที่ต้องตั้ง
- ทุกตารางเปิด RLS แล้ว ถ้ายังไม่เคยตรวจ แนะนำให้รัน `$security-check` ก่อน

## 2. ขั้นตอนที่ผู้ใช้ทำ (Codex เขียนเป็น checklist ให้)

1. push โค้ดขึ้น GitHub (ใน VS Code: Source Control → Commit → Sync Changes)
2. Vercel → Add New → Project → Import repository (Framework: Next.js)
3. Settings → Environment Variables ใส่ค่าตาม `.env.example`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `GMAIL_USER` และ `GMAIL_APP_PASSWORD` ถ้าทำงานเสริมส่งอีเมล (US-6) **ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`**
   - `SUPABASE_SECRET_KEY` เฉพาะเมื่อโค้ดฝั่ง server ใช้จริง และ**ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`**
   - เลือก environment (Production / Preview) ให้ครบตามที่ใช้
4. Deploy (ถ้าแก้ env vars หลัง deploy แล้ว ต้อง **Redeploy** ค่าใหม่จึงจะมีผล)
5. Supabase → Authentication → URL Configuration: ตั้ง Site URL เป็นโดเมน Production และเพิ่ม Redirect URLs ให้ครอบคลุมโดเมน Vercel ที่ใช้ รวม localhost สำหรับพัฒนา

## 3. หลัง deploy

- ทำเส้นทางหลักบน URL จริง: ล็อกอิน → ทำงานหลัก → ออกจากระบบ หรือส่งต่อให้ `$acceptance-test` ตรวจบน URL
- ถ้าพัง ให้ดู Vercel → Deployments → Logs / Runtime Logs ก่อนแก้โค้ด สาเหตุที่พบบ่อยคือ ลืมตั้ง env var, ตั้งผิด environment, ไม่ได้ redeploy หรือ Redirect URL ไม่ตรง

## แนวปฏิบัติต่อไป

- push ขึ้น branch อื่นจะได้ Preview URL ไว้ทดสอบก่อน merge เข้า branch หลัก
- ถ้า deploy ใหม่แล้วพัง ใช้ Instant Rollback ใน Vercel ย้อนไปเวอร์ชันก่อนหน้าได้
- สรุปให้ผู้ใช้: URL ที่ได้, env vars ที่ตั้งแล้ว (บอกแค่ชื่อ ห้ามแสดงค่า), สิ่งที่ยังต้องทำ

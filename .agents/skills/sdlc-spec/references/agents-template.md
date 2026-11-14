# แม่แบบ AGENTS.md

แทนค่าในวงเล็บเหลี่ยมด้วยค่าจริงของโปรเจกต์ ลบบรรทัดที่ไม่เกี่ยวข้องออก

```markdown
# AGENTS.md

## โปรเจกต์
[ชื่อระบบ] — เอกสารหลักอยู่ที่ docs/plan.md, docs/requirements.md, docs/design.md

## Stack
- Next.js (App Router) + TypeScript
- Supabase: Postgres, Auth, RLS ผ่าน @supabase/supabase-js และ @supabase/ssr
- Deploy: Vercel (เชื่อมกับ GitHub)

## คำสั่ง
- ติดตั้ง: npm install
- รันเครื่อง: npm run dev
- ตรวจโค้ด: npm run lint
- ทดสอบ: [npm test หรือคำสั่งจริง]
- build: npm run build

## โครงสร้าง
- app/ หน้าเว็บและ route
- lib/supabase/ ตัวสร้าง client (browser / server)
- supabase/migrations/ ไฟล์ SQL ทุกการเปลี่ยนโครงสร้างฐานข้อมูล

## กติกาที่ห้ามละเมิด
- ห้ามใส่ key, password หรือ token ลงในโค้ดหรือไฟล์ที่ commit
- ฝั่ง browser ใช้ได้เฉพาะ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY ใช้ในโค้ดฝั่ง server เท่านั้น และห้ามขึ้นต้นด้วย NEXT_PUBLIC_
- ทุกตารางใน schema public ต้องเปิด RLS และมี policy ตาม docs/design.md
- ห้ามแก้ปัญหาด้วยการปิด RLS หรือย้าย secret key ไปฝั่ง browser
- แก้โครงสร้างฐานข้อมูลผ่านไฟล์ใน supabase/migrations เท่านั้น
- ทำทีละ user story แล้วสรุปไฟล์ที่แก้และสิ่งที่ผู้ใช้ต้องทดสอบเอง
```

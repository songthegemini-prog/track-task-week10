# ระบบติดตามงานทีม (ชุดเริ่มต้นสำหรับ workshop)

ใน repo นี้มีแค่เอกสารและ Skill ยังไม่มีโค้ด คุณจะสั่ง Codex สร้างเว็บเองตั้งแต่ต้น แล้วสร้างฟีเจอร์ต่อทีละขั้นตาม SDLC

| ไฟล์ | คืออะไร |
|---|---|
| `docs/plan.md` | แผนงาน (ขั้น Planning) ผู้สอนเตรียมไว้ให้ |
| `docs/requirements.md` | ความต้องการ user story และเกณฑ์ยอมรับ (ขั้น Requirements) ผู้สอนเตรียมไว้ให้ |
| `docs/setup-supabase-vercel.md` | คู่มือตั้งค่า Supabase และ Vercel ทีละขั้น |
| `.env.example` | ตัวอย่างไฟล์เก็บรหัสเชื่อม Supabase (ไม่มีค่าจริง) |
| `.agents/skills/` | Skill 7 ตัวที่ Codex ใช้ ได้มาพร้อม repo ไม่ต้องติดตั้งเอง |
| `AGENTS.md` | กติกาที่ Codex ต้องทำตามในโปรเจกต์นี้ |

## สิ่งที่ต้องมีก่อน
- ติดตั้ง VS Code, Node.js (รุ่น LTS) และ Git แล้ว
- ติดตั้ง Codex ใน VS Code และล็อกอินแล้ว
- มีบัญชี GitHub, Supabase และ Vercel และสร้าง project ใน Supabase ไว้ 1 อัน (ทำตาม [คู่มือตั้งค่า Supabase และ Vercel](docs/setup-supabase-vercel.md) ส่วนที่ 1)

## เริ่มใช้งาน (ประมาณ 15 นาที)

1. **เอา repo มาไว้ในเครื่อง**
   บน GitHub กด **Use this template → Create a new repository** ตั้งชื่อ repo ของคุณ
   แล้วใน VS Code กด **Clone Git Repository** วางลิงก์ repo ที่เพิ่งสร้าง เลือกโฟลเดอร์ แล้วกด **Open**
2. **ตรวจว่า Codex เห็น Skill**
   พิมพ์ `$` ในช่องแชทของ Codex ต้องเห็นชื่อ Skill ครบ 7 ตัว ถ้าไม่เห็น ให้ปิดแล้วเปิด VS Code ใหม่
3. **สั่ง Codex สร้างเว็บตั้งต้น** พิมพ์ในแชทของ Codex

   ```
   ใช้ $project-setup สร้างเว็บตั้งต้นในโฟลเดอร์นี้
   ```

   ระหว่างทำงาน Codex จะขออนุญาตรันคำสั่งที่ต้องดาวน์โหลด ให้กด**อนุญาต** รอประมาณ 3–5 นาที
4. **ใส่ค่าการเชื่อม Supabase**
   - คัดลอกไฟล์ `.env.example` แล้วเปลี่ยนชื่อสำเนาเป็น `.env.local`
   - ใน Supabase เปิดโปรเจกต์ → **Project Settings → API Keys** คัดลอก **Publishable key**
   - คัดลอก **Project URL** (ปุ่ม **Connect** ด้านบนของหน้าโปรเจกต์)
   - วางทั้งสองค่าใน `.env.local` แทนค่าตัวอย่าง แล้วบันทึกไฟล์
5. **เปิดเว็บบนเครื่อง** ใน Terminal (เมนู **Terminal → New Terminal**) พิมพ์

   ```
   npm run dev
   ```

   เปิด http://localhost:3000 ต้องเห็นกล่องสีเขียว **"เชื่อม Supabase สำเร็จ"**
   ถ้าเห็นกล่องสีเหลือง ให้อ่านข้อความในกล่องแล้วแก้ตามนั้น

## ทำงานต่อกับ Codex

| ขั้น | พิมพ์ใน Codex |
|---|---|
| สร้างเว็บตั้งต้น | `ใช้ $project-setup สร้างเว็บตั้งต้นในโฟลเดอร์นี้` |
| ออกแบบ | `ใช้ $sdlc-spec อ่าน docs/plan.md และ docs/requirements.md แล้วเขียน docs/design.md โดยไม่แก้สองไฟล์แรก` |
| ล็อกอิน | `ใช้ $supabase-feature ทำ US-1` |
| สร้าง / เข้าร่วมทีม | `ใช้ $supabase-feature ทำ US-2` |
| สร้างและมอบหมายงาน | `ใช้ $supabase-feature ทำ US-3` |
| อัปเดตสถานะงาน | `ใช้ $supabase-feature ทำ US-4` |
| งานเสริม | `ใช้ $supabase-feature ทำ US-5` แล้ว `ทำ US-6` |
| ทดสอบ | `ใช้ $acceptance-test ทำรายการทดสอบของ US ที่ทำแล้ว` |
| ก่อน deploy | `ใช้ $security-check ตรวจโปรเจกต์ รายงานอย่างเดียว` แล้ว `ใช้ $vercel-deploy` |

ทุกครั้งที่ Codex บอกว่ามีไฟล์ SQL ให้รัน: เปิด Supabase → **SQL Editor → New query** วางเนื้อหาไฟล์ แล้วกด **Run**

## บันทึกงาน (commit)
ใน VS Code กดไอคอน **Source Control** ที่แถบซ้าย พิมพ์ข้อความสั้น ๆ ว่าทำอะไร กด **Commit** แล้วกด **Sync Changes** เพื่อส่งขึ้น GitHub

## ห้ามทำ
- ห้ามส่งไฟล์ `.env.local` ให้ใคร หรือวางค่าในแชท
- ห้ามปิด RLS ใน Supabase แม้ข้อมูลจะไม่แสดง ให้ถาม Codex ด้วย `$bug-fix` แทน

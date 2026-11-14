# ส่งอีเมลแจ้งผู้รับงานด้วย Gmail SMTP (US-6)

ส่งอีเมลจาก Server Action หลังหัวหน้าสร้างงานสำเร็จ ผ่านเซิร์ฟเวอร์ส่งอีเมลของ Gmail (SMTP) ด้วยแพ็กเกจ `nodemailer` ถ้ารุ่นที่ติดตั้งเรียก API ต่างจากนี้ ให้ดูเอกสารของรุ่นนั้น

## แพ็กเกจและ env

```bash
npm install nodemailer server-only
npm install -D @types/nodemailer
```

| ชื่อ | ค่า | ที่ใช้ |
|---|---|---|
| `GMAIL_USER` | อีเมล Gmail ที่ใช้ส่ง (บัญชีสำหรับทดลองโดยเฉพาะ) | ฝั่ง server เท่านั้น |
| `GMAIL_APP_PASSWORD` | App Password 16 ตัวอักษรของบัญชีนั้น (ไม่ใช่รหัสผ่าน Gmail ปกติ) | ฝั่ง server เท่านั้น **ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_`** |

เปิดสองบรรทัดนี้ใน `.env.example` (ค่าตัวอย่าง ไม่ใช่ค่าจริง) และห้ามอ่านหรือแสดงค่าจาก `.env.local`

**ทำไมต้องระวังเป็นพิเศษ:** App Password เข้าบัญชี Gmail ได้ทั้งบัญชี ถ้าหลุด คนอื่นอ่านและส่งอีเมลในชื่อบัญชีนั้นได้ จึงต้องใช้บัญชีที่สมัครไว้ทดลองเท่านั้น ห้ามใช้ Gmail ส่วนตัวหรือบัญชีที่ทำงาน

## `lib/email.ts`

```ts
import "server-only";
import nodemailer from "nodemailer";

type TaskAssignedEmail = {
  to: string;
  title: string;
  dueDate: string | null; // รูปแบบ YYYY-MM-DD จากคอลัมน์ date
  teamName: string;
  assignedBy: string;
};

// ส่งอีเมลแจ้งผู้รับงานผ่าน Gmail SMTP คืนผลว่าสำเร็จไหม โดยไม่โยน error ออกไป
// เพื่อให้สร้างงานสำเร็จได้แม้ส่งอีเมลไม่ได้ (AC-6.3)
export async function sendTaskAssignedEmail(
  input: TaskAssignedEmail,
): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return false;

  const due = input.dueDate
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "long",
        timeZone: "Asia/Bangkok",
      }).format(new Date(`${input.dueDate}T00:00:00+07:00`))
    : "ไม่มีกำหนด";

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `ระบบติดตามงานทีม <${user}>`,
      to: input.to,
      subject: `งานใหม่: ${input.title}`,
      text: [
        `${input.assignedBy} มอบหมายงานใหม่ให้คุณ`,
        "",
        `งาน: ${input.title}`,
        `กำหนดส่ง: ${due}`,
        `ทีม: ${input.teamName}`,
      ].join("\n"),
    });
    return true;
  } catch {
    return false;
  }
}
```

## เรียกใช้ใน Server Action ของการสร้างงาน

1. ตรวจผู้ใช้ด้วย `supabase.auth.getUser()` แล้วสร้างงานตามเดิม ถ้าไม่สำเร็จ (ไม่ใช่หัวหน้า ผู้รับงานไม่อยู่ในทีม หรือไม่กรอกชื่องาน) ให้คืนข้อความผิดพลาดเดิมและ**ไม่ส่งอีเมล** (AC-6.2)
2. สำเร็จแล้วค่อยอ่าน `email` ของผู้รับงานจากตาราง `profiles` ด้วย `assignee_id` ของงานที่เพิ่งสร้าง (RLS ให้หัวหน้าอ่านโปรไฟล์ของเพื่อนร่วมทีมได้อยู่แล้ว) **ห้ามรับอีเมลผู้รับจากฟอร์มหรือคำขอ** (AC-6.4)
3. อ่านชื่อทีมจาก `teams` และชื่อที่แสดงของหัวหน้าจาก `profiles` แล้วเรียก `sendTaskAssignedEmail`
4. ถ้าได้ `false` ให้คืนผลว่าสร้างงานสำเร็จพร้อมข้อความ "สร้างงานแล้ว แต่ส่งอีเมลแจ้งไม่สำเร็จ" ห้ามลบงานที่สร้างแล้ว (AC-6.3)
5. ห้าม import `lib/email.ts` ในไฟล์ที่ขึ้นต้นด้วย `"use client"` (`server-only` จะทำให้ build ไม่ผ่านถ้าเผลอ import)
6. ห้ามตั้ง `export const runtime = "edge"` ในไฟล์ที่ส่งอีเมล เพราะ SMTP ต้องใช้ Node.js runtime (ค่าเริ่มต้น)

ไม่ต้องสร้างตารางหรือ migration ใหม่สำหรับ US-6 (อีเมลของผู้ใช้เก็บไว้ใน `profiles` ตั้งแต่ US-1)

## สิ่งที่คุณต้องทำเอง (เขียนให้ผู้ใช้ตามนี้)

1. สมัคร **Gmail ใหม่สำหรับทดลอง** 1 บัญชี (อย่าใช้ Gmail ส่วนตัวหรือบัญชีที่ทำงาน)
2. ในบัญชีใหม่: myaccount.google.com → **Security** → เปิด **2-Step Verification** (ต้องใช้เบอร์โทรศัพท์)
3. เปิด myaccount.google.com/apppasswords → ตั้งชื่อ เช่น `workshop` → **Create** → คัดลอกรหัส 16 ตัว (เห็นได้ครั้งเดียว)
4. เปิด `.env.local` เพิ่ม 2 บรรทัด แล้วบันทึก (**ห้ามเติม `NEXT_PUBLIC_` ข้างหน้า** และห้ามวางรหัสในแชท)
   ```
   GMAIL_USER=อีเมลบัญชีทดลอง@gmail.com
   GMAIL_APP_PASSWORD=รหัส16ตัวไม่ต้องเว้นวรรค
   ```
5. หยุด `npm run dev` (กด Ctrl+C) แล้วรันใหม่ เพื่อให้อ่านค่าใหม่
6. ล็อกอินบัญชีหัวหน้า สร้างงาน 1 ชิ้นมอบให้สมาชิก แล้วเปิดกล่องอีเมลของผู้รับงาน (ดูในโฟลเดอร์สแปมด้วย)
7. ตอน deploy: Vercel → Settings → Environment Variables → เพิ่มทั้ง 2 ค่า → **Redeploy**
8. เลิกใช้หรือสงสัยว่ารหัสหลุด: เปิด myaccount.google.com/apppasswords แล้วลบ App Password นั้นทันที

**ข้อจำกัด:** Gmail ส่งได้ประมาณ 500 ผู้รับต่อวัน ผู้รับเห็นผู้ส่งเป็นอีเมลบัญชีทดลอง บัญชีของมหาวิทยาลัยหรือที่ทำงานอาจปิดการสร้าง App Password ไว้

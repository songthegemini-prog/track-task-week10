# ไฟล์ต้นแบบของเว็บตั้งต้น

ใช้เนื้อหาตามนี้ ถ้ารุ่นที่ติดตั้งเปลี่ยน API ให้ปรับตามเอกสารใน `node_modules/next/dist/docs/` และเอกสาร Supabase "Server-Side Auth for Next.js" โดยคงหน้าที่ของแต่ละไฟล์ไว้

## `lib/supabase/env.ts`

```tsx
// อ่านค่าที่ใส่ไว้ใน .env.local (บนเครื่อง) หรือ Environment Variables (บน Vercel)
// ทั้งสองค่านี้เปิดเผยได้ เพราะข้อมูลถูกป้องกันด้วย RLS ในฐานข้อมูล
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);
```

## `lib/supabase/client.ts`

```tsx
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

// ใช้ในไฟล์ที่ขึ้นต้นด้วย "use client" (โค้ดที่ทำงานในเบราว์เซอร์)
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
```

## `lib/supabase/server.ts`

```tsx
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
```

## `proxy.ts`

```tsx
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasSupabaseEnv,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";

// ทำงานก่อนทุกหน้า: รีเฟรช session การล็อกอินของ Supabase ให้ไม่หลุด
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ตรวจและรีเฟรช token ของผู้ใช้ที่ล็อกอินอยู่
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## `app/page.tsx`

```tsx
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// ตรวจสถานะใหม่ทุกครั้งที่เปิดหน้า ไม่จำผลไว้ตอน build
export const dynamic = "force-dynamic";

type Status = { ok: boolean; title: string; detail: string };

// ตรวจว่าเชื่อม Supabase ได้หรือยัง เพื่อให้ผู้เรียนรู้ว่าตั้งค่าครบแล้ว
async function checkSupabase(): Promise<Status> {
  if (!hasSupabaseEnv) {
    return {
      ok: false,
      title: "ยังไม่ได้ใส่ค่าใน .env.local",
      detail:
        "คัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่ Project URL และ Publishable key จาก Supabase จากนั้นหยุดแล้วรัน npm run dev ใหม่",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (!error) {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ และพบตาราง profiles แล้ว",
      detail: "พร้อมทำ user story ถัดไป",
    };
  }

  const missingTable =
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table|does not exist/i.test(error.message);

  if (missingTable) {
    return {
      ok: true,
      title: "เชื่อม Supabase สำเร็จ",
      detail:
        "ยังไม่มีตาราง profiles ซึ่งถูกต้องสำหรับตอนเริ่มต้น ขั้นต่อไปคือออกแบบระบบ แล้วสั่ง Codex ทำ US-1",
    };
  }

  return {
    ok: false,
    title: "เชื่อม Supabase ไม่สำเร็จ",
    detail: `ตรวจ Project URL และ Publishable key ใน .env.local อีกครั้ง (ข้อความจากระบบ: ${error.message})`,
  };
}

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">
        โปรเจกต์ตั้งต้นสำหรับ workshop สร้างระบบด้วย Codex
      </p>

      <section
        className={`mt-8 rounded-2xl border p-6 ${
          status.ok
            ? "border-emerald-300 bg-emerald-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-sm font-semibold">
          {status.ok ? "สถานะ: พร้อม" : "สถานะ: ยังไม่พร้อม"}
        </p>
        <h2 className="mt-1 text-xl font-bold">{status.title}</h2>
        <p className="mt-2 text-slate-700">{status.detail}</p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-blue-900">ขั้นต่อไป</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
          <li>อ่าน docs/plan.md และ docs/requirements.md</li>
          <li>สั่ง Codex: ใช้ $sdlc-spec เขียน docs/design.md</li>
          <li>สั่ง Codex: ใช้ $supabase-feature ทำ US-1</li>
        </ol>
      </section>
    </main>
  );
}
```

## `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ระบบติดตามงานทีม",
  description: "Workshop: สร้างระบบด้วย Codex",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-thai)] bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
```

## `next.config.ts` (หลังลบ cacheComponents และ partialPrefetching)

```ts
import type { NextConfig } from "next";

// Workshop: ปิด Cache Components ไว้ เพื่อให้หน้าที่ใช้การล็อกอิน (cookies) ทำงานแบบปกติ
// โดยไม่ต้องครอบ <Suspense> เพิ่ม ลดโอกาสที่ build ไม่ผ่านสำหรับผู้เริ่มต้น
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

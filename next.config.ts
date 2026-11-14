import type { NextConfig } from "next";

// Workshop: ปิด Cache Components ไว้ เพื่อให้หน้าที่ใช้การล็อกอิน (cookies) ทำงานแบบปกติ
// โดยไม่ต้องครอบ <Suspense> เพิ่ม ลดโอกาสที่ build ไม่ผ่านสำหรับผู้เริ่มต้น
const nextConfig: NextConfig = {
  // Optional isolated output when a running dev server has locked .next files.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
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

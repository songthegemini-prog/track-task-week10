import Link from "next/link";
import { SignOutButton } from "@/app/sign-out-button";

export function AccountHeader({ displayName }: { displayName: string }) {
  return <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
      <Link href="/team" className="font-bold text-blue-900">ระบบติดตามงานทีม</Link>
      <nav aria-label="เมนูทีม" className="flex gap-4 text-sm text-blue-800"><Link href="/team">ทีม</Link><Link href="/tasks">งานของทีม</Link></nav>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
        <span className="max-w-full break-words text-sm">{displayName}</span>
        <SignOutButton />
      </div>
    </div>
  </header>;
}

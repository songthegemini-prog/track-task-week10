"use client";

import { useActionState } from "react";
import { signOutAction } from "@/app/auth-actions";

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOutAction, { message: "" });
  return <form action={action} className="max-w-full">
    <button disabled={pending} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-700">
      {pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
    </button>
    <p role={state.message ? "alert" : undefined} aria-live="polite" className="mt-1 max-w-xs text-sm text-red-700">{state.message}</p>
  </form>;
}

import { requireAccount } from "@/lib/auth/server";
import { AccountHeader } from "@/app/account-header";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  return <>
    <AccountHeader displayName={account.displayName} />
    <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
  </>;
}

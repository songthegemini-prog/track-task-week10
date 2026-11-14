import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getAccount } from "./flow";

// React cache deduplicates only within a render, never across users/requests.
export const requireAccount = cache(async () => {
  if (!hasSupabaseEnv) redirect("/login");
  const account = await getAccount(await createClient());
  if (account.kind === "anonymous") redirect("/login");
  if (account.kind === "error") throw new Error(account.message);
  return account;
});

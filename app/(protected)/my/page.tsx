import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/server";

export default async function MyPage() {
  await requireAccount();
  redirect("/team");
}

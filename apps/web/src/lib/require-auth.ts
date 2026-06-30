import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth";

export async function requireAuth() {
  const cookieStore = await cookies();
  const auth = cookieStore.get(AUTH_COOKIE);
  if (!auth?.value) {
    redirect("/login");
  }
}

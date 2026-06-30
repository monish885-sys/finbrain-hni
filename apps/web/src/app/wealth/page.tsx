import { redirect } from "next/navigation";

export default function LegacyWealthRedirect() {
  redirect("/owner/wealth");
}

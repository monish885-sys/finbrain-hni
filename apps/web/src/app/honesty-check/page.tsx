import { redirect } from "next/navigation";

export default function LegacyHonestyCheckRedirect() {
  redirect("/owner/honesty-check");
}

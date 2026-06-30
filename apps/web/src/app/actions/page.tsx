import { redirect } from "next/navigation";

export default function LegacyActionsRedirect() {
  redirect("/owner/actions");
}

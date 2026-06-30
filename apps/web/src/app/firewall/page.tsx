import { redirect } from "next/navigation";

export default function LegacyFirewallRedirect() {
  redirect("/owner/firewall");
}

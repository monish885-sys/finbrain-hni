import { redirect } from "next/navigation";

export default async function LegacyActionDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/owner/actions/${id}`);
}

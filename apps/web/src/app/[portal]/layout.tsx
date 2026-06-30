import { notFound } from "next/navigation";
import { isPortalId } from "@capstone/types";

export default async function PortalSegmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  if (!isPortalId(portal)) {
    notFound();
  }
  return children;
}

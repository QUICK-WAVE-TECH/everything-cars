"use client";

import { useParams } from "next/navigation";
import { DealRevealPage } from "@/features/deals/components/deal-reveal-page";

export default function DealRoutePage() {
  const params = useParams();
  const dealId = params?.id as string;
  if (!dealId) return null;
  return <DealRevealPage dealId={dealId} />;
}

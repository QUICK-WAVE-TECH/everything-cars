"use client";

import { useParams } from "next/navigation";
import { CarDetailPage } from "@/features/listings/components";

export default function CarDetailRoutePage() {
  const params = useParams();
  const carId = params?.id as string;

  if (!carId) return null;

  return <CarDetailPage carId={carId} />;
}

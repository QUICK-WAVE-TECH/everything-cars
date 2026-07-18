import { Suspense } from "react";
import { ServicesListing } from "@/features/website/sections";

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesListing />
    </Suspense>
  );
}

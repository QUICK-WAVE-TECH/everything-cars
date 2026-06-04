import { CarDetailPage } from "@/features/listings/components";
import { DETAIL_CAR } from "@/features/listings/components/car-detail-data";

export function generateMetadata() {
  return {
    title: `${DETAIL_CAR.name} — Rent or Buy | EverythingCars`,
    description: DETAIL_CAR.intro.slice(0, 160),
    openGraph: {
      title: `${DETAIL_CAR.name} — EverythingCars`,
      description: DETAIL_CAR.intro.slice(0, 160),
      images: ["/car-lexus.png"],
    },
  };
}

export default function CarDetailRoutePage() {
  return <CarDetailPage />;
}

"use client";

import { SectionHead } from "@/shared/components/section-head";
import { CarRow } from "@/shared/components/car-row";

import type { Car } from "@/shared/components/car-card";

const RENTED: Car[] = [
  { id: 1, name: "Lexus NX 300h", type: "SUV", location: "Lagos, Nigeria", rentPrice: 35000, rating: 4, mode: "rent", available: true, year: 2022 },
  { id: 2, name: "Toyota RAV4", type: "SUV", location: "Abuja, Nigeria", rentPrice: 42000, rating: 5, mode: "rent", available: true, year: 2022 },
  { id: 3, name: "Mercedes C300", type: "Luxury", location: "Lagos, Nigeria", rentPrice: 80000, rating: 4, mode: "rent", available: false, year: 2023 },
  { id: 4, name: "Honda Accord", type: "Sedan", location: "Port Harcourt", rentPrice: 30000, rating: 4, mode: "rent", available: true, year: 2020 },
  { id: 5, name: "Range Rover Velar", type: "Luxury", location: "Lagos, Nigeria", rentPrice: 150000, rating: 5, mode: "rent", available: true, year: 2023 },
];

const PURCHASED: Car[] = [
  { id: 11, name: "Lexus NX 300h", type: "SUV", location: "Lagos, Nigeria", buyPrice: 20000000, rating: 4, mode: "buy", available: true, year: 2022, mileage: 25000 },
  { id: 12, name: "BMW X5", type: "SUV", location: "Abuja, Nigeria", buyPrice: 54000000, rating: 5, mode: "buy", available: true, year: 2024, mileage: 0 },
  { id: 13, name: "Toyota Corolla", type: "Sedan", location: "Ibadan, Nigeria", buyPrice: 13000000, rating: 4, mode: "buy", available: false, year: 2020, mileage: 47000 },
  { id: 14, name: "Audi Q7", type: "SUV", location: "Lagos, Nigeria", buyPrice: 62000000, rating: 5, mode: "buy", available: true, year: 2024, mileage: 0 },
];

const LISTED: Car[] = [
  { id: 21, name: "Lexus NX 300h", type: "SUV", location: "Lagos, Nigeria", rentPrice: 35000, rating: 4, mode: "list", available: true, year: 2022 },
  { id: 22, name: "Kia Sportage", type: "SUV", location: "Abuja, Nigeria", rentPrice: 38000, rating: 4, mode: "list", available: true, year: 2021 },
  { id: 23, name: "Ford Ranger", type: "Pickup", location: "Kano, Nigeria", rentPrice: 45000, rating: 4, mode: "list", available: true, year: 2022 },
  { id: 24, name: "Hyundai Elantra", type: "Sedan", location: "Lagos, Nigeria", rentPrice: 28000, rating: 5, mode: "list", available: false, year: 2019 },
];

export function ServicesSection() {
  return (
    <section style={{ background: "#fff", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(48px, 8vw, 80px)" }}>
        <div style={{ alignSelf: "center" }}>
          <SectionHead
            pill="Our Services"
            title="Find the Perfect Car for Every Journey"
            sub="Choose from our premium collection of vehicles for rent, buy, or sell."
            center
          />
        </div>
        <CarRow title="MOST RENTED CARS" cars={RENTED} />
        <CarRow title="MOST PURCHASED CARS" cars={PURCHASED} />
        <CarRow title="MOST LISTED CARS" cars={LISTED} />
      </div>
    </section>
  );
}

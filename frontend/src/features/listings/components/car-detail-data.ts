// Static data for the car detail page.
// Kept in its own file so it can be imported by both the client
// component and the server-side page (for generateMetadata).

export const DETAIL_CAR = {
  name: "Lexus NX 300h",
  type: "SUV",
  colour: "Grey",
  model: "2024",
  rentPrice: 35000,
  buyPrice: 35000000,
  rating: 4.5,
  reviewCount: 120,
  specs: [
    ["Colour", "Grey"],
    ["Fuel Type", "Hybrid (Petrol + Electric)"],
    ["Transmission", "Automatic"],
    ["Seating Capacity", "5 passengers"],
    ["Model Year", "2024"],
    ["Body Type", "SUV"],
  ] as [string, string][],
  features: [
    ["Hybrid Efficiency", "Enjoy a smooth, eco-friendly drive with exceptional fuel economy."],
    ["Premium Comfort", "Plush leather seats, ambient lighting, and dual-zone climate control."],
    ["Smart Technology", "Responsive infotainment, rearview camera, and intelligent safety features."],
    ["Elegant Design", "Distinctive Lexus grille, aerodynamic body lines, and refined LED headlights."],
    ["Performance Ready", "2.5L hybrid engine with seamless acceleration and precise handling."],
  ] as [string, string][],
  intro:
    "Step into sophistication with the Lexus NX 300h, where innovation meets indulgence. This hybrid SUV blends sleek design, advanced performance, and modern comfort — making every journey an experience of quiet luxury.",
};

export const REVIEWS = [
  {
    name: "John Adewara",
    date: "March 22, 2025",
    rating: 5,
    text: "Exceptional ride. The car was spotless, the chauffeur was professional, and the whole process was effortless.",
  },
  {
    name: "Chika Akor",
    date: "March 18, 2025",
    rating: 5,
    text: "Smooth and quiet drive, great fuel economy. Easily the most comfortable SUV I've rented in Lagos.",
  },
  {
    name: "Aisha Bello",
    date: "March 11, 2025",
    rating: 4,
    text: "Lovely car and very responsive owner. Pickup was a little delayed but everything else was perfect.",
  },
  {
    name: "Daniel Obi",
    date: "March 4, 2025",
    rating: 5,
    text: "Booked it for a weekend getaway and it did not disappoint. Will definitely rent again.",
  },
];

export const RATING_DIST: [number, number][] = [
  [5, 86],
  [4, 22],
  [3, 8],
  [2, 3],
  [1, 1],
];

export const GALLERY_IMAGES = [
  "/car-lexus.png",
  "/car-lexus.png",
  "/car-lexus.png",
  "/car-lexus.png",
];

export const GALLERY_ALTS = [
  "Lexus NX 300h - Front view",
  "Lexus NX 300h - Side view",
  "Lexus NX 300h - Rear view",
  "Lexus NX 300h - Interior view",
];

export const MERCH_DESIGNS = [
  { id: "main", name: "Main · Black" },
  { id: "alternate", name: "Alternate · White" },
];

export const MERCH_OFFERS = [
  { id: "single", name: "One T-shirt", shirtCount: 1 },
  { id: "duo", name: "Any two T-shirts", shirtCount: 2 },
];

export function getReservationItems(reservation) {
  if (Array.isArray(reservation?.items)) return reservation.items;
  if (!reservation?.design && !reservation?.designName) return [];
  return [{ design: reservation.design, designName: reservation.designName, size: reservation.size, fit: reservation.fit, quantity: reservation.quantity }];
}

export function describeMerchItem(item) {
  const design = item.designName || MERCH_DESIGNS.find((design) => design.id === item.design)?.name || item.design;
  return `${design} · ${item.fit === "female" ? "Female" : "Male"} · ${item.size}`;
}

const imageBase = "https://res.cloudinary.com/gho3c66o/image/upload/v1792778766";

export const MERCH_VARIANTS = [
  { id: "main-male", design: "main", fit: "male", name: "Main · Black", fitLabel: "Male", image: `${imageBase}/GO_TShirt_Main_Male_Black.png` },
  { id: "alternate-male", design: "alternate", fit: "male", name: "Alternate · White", fitLabel: "Male", image: `${imageBase}/GO_TShirt_Alternate_Male_White.png` },
  { id: "main-female", design: "main", fit: "female", name: "Main · Black", fitLabel: "Female", image: `${imageBase}/GO_TShirt_Main_Female_Black.png` },
  { id: "alternate-female", design: "alternate", fit: "female", name: "Alternate · White", fitLabel: "Female", image: `${imageBase}/GO_TShirt_Alternate_Female_White.png` },
];

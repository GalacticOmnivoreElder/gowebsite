// Roly's general EU body-size guide, not garment width/length measurements.
// Source: https://roly.eu/en/sizesGuide, Men/Women > Top parts
// (both interactive charts checked 29 October 2026).
// Roly labels XXL as 2XL; the reservation API keeps its existing XXL value.
export const MERCH_SIZE_GUIDE_URL = "https://roly.eu/en/sizesGuide";
export const MERCH_SIZE_GUIDES = {
  male: [
    { size: "XS", chestCm: "87–90" },
    { size: "S", chestCm: "91–94" },
    { size: "M", chestCm: "95–98" },
    { size: "L", chestCm: "99–106" },
    { size: "XL", chestCm: "107–114" },
    { size: "XXL", chestCm: "115–122" },
  ],
  female: [
    { size: "XS", chestCm: "71–76" },
    { size: "S", chestCm: "77–82" },
    { size: "M", chestCm: "83–88" },
    { size: "L", chestCm: "89–94" },
    { size: "XL", chestCm: "95–100" },
    { size: "XXL", chestCm: "101–106" },
  ],
};

export function getMerchSizeGuide(fit) {
  return Object.hasOwn(MERCH_SIZE_GUIDES, fit) ? MERCH_SIZE_GUIDES[fit] : [];
}

export function merchChestRange(size, fit) {
  return getMerchSizeGuide(fit).find((entry) => entry.size === size)?.chestCm || "";
}

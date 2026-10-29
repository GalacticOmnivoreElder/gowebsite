export const DEFAULT_PROFILE_APPEARANCE = {
  style: "cosmic",
  backgroundColor: "#211126",
  accentColor: "#e85ca7",
};

export const PROFILE_ART_STYLES = [
  { value: "cosmic", label: "Cosmic", description: "Stars and a soft glow" },
  { value: "grid", label: "Blueprint", description: "A structured grid" },
  { value: "aurora", label: "Aurora", description: "Flowing light" },
  { value: "minimal", label: "Minimal", description: "A quiet gradient" },
];

// Keep controls legible on the dark profile cards, even for very dark colors.
function accessibleAccent(hex) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === rgb[0]) hue = ((rgb[1] - rgb[2]) / delta) % 6;
    else if (max === rgb[1]) hue = (rgb[2] - rgb[0]) / delta + 2;
    else hue = (rgb[0] - rgb[1]) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.max(70, Math.round(lightness * 100))}%`;
}

export function getProfileAppearanceProps(appearance) {
  if (!appearance || !PROFILE_ART_STYLES.some((style) => style.value === appearance.style) ||
      !/^#[0-9a-f]{6}$/i.test(appearance.backgroundColor || "") ||
      !/^#[0-9a-f]{6}$/i.test(appearance.accentColor || "")) return {};

  return {
    "data-profile-art": appearance.style,
    style: {
      "--profile-background": appearance.backgroundColor,
      "--primary": accessibleAccent(appearance.accentColor),
      "--primary-foreground": "0 0% 5%",
    },
  };
}

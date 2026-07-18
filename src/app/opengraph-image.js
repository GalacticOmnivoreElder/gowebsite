import { ImageResponse } from "next/og";

const SITE_NAME = "Galactic Omnivore";
const DESCRIPTION =
  "Galactic Omnivore is Macedonia's game development community for learning, collaboration, portfolio building, and finding a game dev team.";

export const runtime = "edge";
export const alt = `${SITE_NAME} game development community`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050505",
          color: "white",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: 30,
            color: "#f2f2f2",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: "#CA2280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            GO
          </div>
          Macedonia Game Dev Community
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: 0 }}>
            {SITE_NAME}
          </div>
          <div
            style={{
              maxWidth: 900,
              fontSize: 34,
              lineHeight: 1.28,
              color: "#d7d7d7",
            }}
          >
            {DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}

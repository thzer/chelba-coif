import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Image affichée quand le lien du site est partagé (WhatsApp, Facebook,
// Instagram, Messenger…). Générée une fois au build.
export const alt = "Chelba Coif — Barber Shop à Djerba";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = await readFile(join(process.cwd(), "public/logo.png"));
const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "#070707",
          color: "#ffffff",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={300} height={300} alt="" />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 10,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            BARBER SHOP • DJERBA
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            Chelba Coif
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Coupes modernes, fades, barbe.
          </div>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 24,
              color: "#070707",
              background: "#ffffff",
              borderRadius: 999,
              padding: "14px 32px",
              alignSelf: "flex-start",
              fontWeight: 700,
            }}
          >
            Réserver en ligne
          </div>
        </div>
      </div>
    ),
    size
  );
}

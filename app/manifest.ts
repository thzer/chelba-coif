import type { MetadataRoute } from "next";

/**
 * Manifeste PWA : permet d'« installer » l'admin sur l'écran d'accueil du
 * téléphone (plein écran) — indispensable pour les notifications push sur
 * iPhone, pratique sur Android.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chelba Coif",
    short_name: "Chelba Coif",
    description: "Barber shop à Djerba — réservation en ligne et administration.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#070707",
    lang: "fr",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

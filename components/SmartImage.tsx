"use client";

import Image from "next/image";

/**
 * Hôtes autorisés pour l'optimisation next/image (doit correspondre à
 * `images.remotePatterns` dans next.config.ts). Toute autre URL est affichée
 * avec un <img> classique plutôt que de faire planter la page.
 */
const OPTIMIZED_HOSTS = [
  "napycyccvnqxgzmkjydf.supabase.co",
  "images.unsplash.com",
];

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;

  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Indique au navigateur la largeur affichée pour choisir la bonne taille. */
  sizes?: string;
  priority?: boolean;
};

/**
 * Image de remplissage (`fill`) : le parent doit être `relative` avec une
 * hauteur définie. Sert les images redimensionnées / WebP / lazy-load.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
}: Props) {
  if (!src) return null;

  if (!canOptimize(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}

/**
 * URL publique du site (sans slash final).
 *
 * Définie via NEXT_PUBLIC_SITE_URL dans les variables d'environnement
 * (Vercel > Settings > Environment Variables). À mettre à jour lorsque le
 * client passe sur son propre nom de domaine : métadonnées, sitemap et
 * robots.txt suivent automatiquement.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chelba-coif-six.vercel.app"
).replace(/\/+$/, "");

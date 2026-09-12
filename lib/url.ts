/**
 * Retourne l'URL si elle est http(s), sinon null.
 * Évite les liens `javascript:` / `data:` dans les href et src
 * alimentés par des valeurs venant de la base de données.
 */
export function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Normalisation des numéros de téléphone saisis par les clients.
 *
 * - Tunisie (par défaut) : 8 chiffres, mobiles commençant par 2, 4, 5 ou 9,
 *   fixes par 3 ou 7. Accepte "50 882 529", "0050882529", "216 50…", "+216…".
 * - Étranger : format international "+XX…" (8 à 15 chiffres), accepté tel quel.
 *
 * Renvoie le numéro au format E.164 ("+21650882529") ou null si invalide.
 */

const TN_MOBILE_PREFIXES = ["2", "4", "5", "9"];
const TN_LANDLINE_PREFIXES = ["3", "7"];

export type PhoneCheck =
  | { ok: true; e164: string; display: string; country: "TN" | "INTL"; mobile: boolean }
  | { ok: false; reason: "empty" | "too_short" | "too_long" | "invalid_prefix" | "invalid" };

export function checkPhone(raw: string): PhoneCheck {
  let value = raw.trim();
  if (!value) return { ok: false, reason: "empty" };

  // "00" international → "+"
  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  const hasPlus = value.startsWith("+");
  let digits = value.replace(/\D/g, "");

  if (!digits) return { ok: false, reason: "invalid" };

  // Étranger (indicatif ≠ 216) — sauf "00"/"+" suivi d'un numéro tunisien à 8 chiffres
  const looksTunisian =
    digits.length === 8 &&
    [...TN_MOBILE_PREFIXES, ...TN_LANDLINE_PREFIXES].includes(digits[0]);

  if (hasPlus && !digits.startsWith("216") && !looksTunisian) {
    if (digits.length < 8) return { ok: false, reason: "too_short" };
    if (digits.length > 15) return { ok: false, reason: "too_long" };
    return {
      ok: true,
      e164: `+${digits}`,
      display: `+${digits}`,
      country: "INTL",
      mobile: true,
    };
  }

  // Tunisie : retire l'indicatif éventuel
  if (digits.startsWith("216") && digits.length === 11) digits = digits.slice(3);
  if (digits.startsWith("0") && digits.length === 9) digits = digits.slice(1);

  if (digits.length < 8) return { ok: false, reason: "too_short" };
  if (digits.length > 8) return { ok: false, reason: "too_long" };

  const prefix = digits[0];
  const mobile = TN_MOBILE_PREFIXES.includes(prefix);
  if (!mobile && !TN_LANDLINE_PREFIXES.includes(prefix)) {
    return { ok: false, reason: "invalid_prefix" };
  }

  return {
    ok: true,
    e164: `+216${digits}`,
    display: `+216 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`,
    country: "TN",
    mobile,
  };
}

/** Affichage lisible d'un numéro déjà stocké (E.164 ou ancien format libre). */
export function formatPhone(stored: string) {
  const check = checkPhone(stored);
  return check.ok ? check.display : stored;
}

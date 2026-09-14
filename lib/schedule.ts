/**
 * Horaires d'ouverture et calcul des créneaux disponibles.
 *
 * Les horaires sont stockés dans `settings.schedule` (JSON) et modifiables
 * depuis l'admin. Les fermetures exceptionnelles (vacances, fériés) sont dans
 * la table `closures`.
 */

export type DaySchedule = {
  open: string; // "09:00"
  close: string; // "19:00"
  break_start?: string | null; // "12:30"
  break_end?: string | null; // "14:00"
};

/** Clés = jour JS : 0 = dimanche … 6 = samedi. `null` = fermé. */
export type WeekSchedule = Record<string, DaySchedule | null>;

export type Closure = {
  id: number;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  reason: string | null;
};

export type BookedSlot = {
  barber_id: number | null;
  appointment_time: string;
  duration: number;
};

export type Barber = {
  id: number;
  name: string;
  active: boolean;
  sort_order: number;
  photo_url: string | null;
  bio: string | null;
  commission_pct?: number | null;
};

/** Créneaux d'un barbier précis (les RDV sans barbier bloquent tout le monde). */
export function slotsForBarber(booked: BookedSlot[], barberId: number) {
  return booked.filter((b) => b.barber_id === barberId || b.barber_id === null);
}

const DEFAULT_DAY: DaySchedule = {
  open: "09:00",
  close: "19:00",
  break_start: "12:30",
  break_end: "14:00",
};

export const DEFAULT_SCHEDULE: WeekSchedule = {
  "0": { ...DEFAULT_DAY },
  "1": { ...DEFAULT_DAY },
  "2": { ...DEFAULT_DAY },
  "3": null,
  "4": { ...DEFAULT_DAY },
  "5": { ...DEFAULT_DAY },
  "6": { ...DEFAULT_DAY, close: "20:00" },
};

export const DEFAULT_SLOT_INTERVAL = 30;

/** Ordre d'affichage : lundi → dimanche. */
export const WEEK_DAYS = ["1", "2", "3", "4", "5", "6", "0"] as const;

export const DAY_NAMES_FR: Record<string, string> = {
  "0": "Dimanche",
  "1": "Lundi",
  "2": "Mardi",
  "3": "Mercredi",
  "4": "Jeudi",
  "5": "Vendredi",
  "6": "Samedi",
};

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" en heure locale (pas UTC). */
export function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDayKey(date: string) {
  return String(new Date(`${date}T12:00:00`).getDay());
}

export function getDaySchedule(schedule: WeekSchedule, date: string) {
  return schedule[getDayKey(date)] ?? null;
}

export function findClosure(closures: Closure[], date: string) {
  return closures.find((c) => date >= c.start_date && date <= c.end_date) ?? null;
}

export function formatDayHours(day: DaySchedule | null) {
  if (!day) return "Fermé";

  const base = `${day.open} – ${day.close}`;

  if (day.break_start && day.break_end) {
    return `${day.open} – ${day.break_start} / ${day.break_end} – ${day.close}`;
  }

  return base;
}

/** Vérifie la cohérence d'une journée. Renvoie un message d'erreur ou null. */
export function validateDay(day: DaySchedule | null) {
  if (!day) return null;

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);

  if (!(open < close)) return "L'heure d'ouverture doit précéder la fermeture.";

  if (day.break_start || day.break_end) {
    if (!day.break_start || !day.break_end) {
      return "Indiquez le début et la fin de la pause, ou laissez les deux vides.";
    }

    const bs = toMinutes(day.break_start);
    const be = toMinutes(day.break_end);

    if (!(open <= bs && bs < be && be <= close)) {
      return "La pause doit être comprise dans les heures d'ouverture.";
    }
  }

  return null;
}

type SlotInput = {
  schedule: WeekSchedule;
  closures: Closure[];
  date: string;
  interval: number;
  serviceDuration: number;
  booked: BookedSlot[];
  /** Instant courant, pour exclure les créneaux passés du jour même. */
  now?: Date;
};

/**
 * Créneaux réservables pour une date, en tenant compte des horaires du jour,
 * de la pause, des fermetures, de la durée du service et des rendez-vous
 * déjà pris (avec leur durée réelle).
 */
export function computeAvailableSlots({
  schedule,
  closures,
  date,
  interval,
  serviceDuration,
  booked,
  now = new Date(),
}: SlotInput): string[] {
  if (!date) return [];

  const day = getDaySchedule(schedule, date);

  if (!day || findClosure(closures, date)) return [];

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const breakStart = day.break_start ? toMinutes(day.break_start) : null;
  const breakEnd = day.break_end ? toMinutes(day.break_end) : null;

  const busy = booked.map((b) => {
    const start = toMinutes(b.appointment_time);
    return [start, start + Math.max(b.duration || interval, 1)] as const;
  });

  const isToday = date === toDateString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const overlaps = (start: number, end: number, s: number, e: number) =>
    start < e && end > s;

  const slots: string[] = [];

  for (let start = open; start + serviceDuration <= close; start += interval) {
    const end = start + serviceDuration;

    if (
      breakStart !== null &&
      breakEnd !== null &&
      overlaps(start, end, breakStart, breakEnd)
    ) {
      continue;
    }

    if (busy.some(([s, e]) => overlaps(start, end, s, e))) continue;

    if (isToday && start <= nowMinutes) continue;

    slots.push(toTime(start));
  }

  return slots;
}

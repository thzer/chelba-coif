/**
 * Réservations mémorisées sur l'appareil du client (localStorage).
 * Permet d'afficher « Mes rendez-vous » sans compte : seuls les jetons
 * des réservations faites (ou ouvertes) depuis cet appareil sont connus.
 */

export type StoredBooking = {
  token: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  service: string;
  barber: string;
  savedAt: number;
};

const KEY = "chelba_my_bookings";

export function readBookings(): StoredBooking[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as StoredBooking[]) : [];
    return Array.isArray(list) ? list.filter((b) => b && typeof b.token === "string") : [];
  } catch {
    return [];
  }
}

function writeBookings(list: StoredBooking[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-20)));
  } catch {}
}

export function saveBooking(booking: Omit<StoredBooking, "savedAt">) {
  const list = readBookings().filter((b) => b.token !== booking.token);
  list.push({ ...booking, savedAt: Date.now() });
  writeBookings(list);
}

export function removeBooking(token: string) {
  writeBookings(readBookings().filter((b) => b.token !== token));
}

/** RDV à venir (aujourd'hui inclus), du plus proche au plus lointain. */
export function upcomingBookings(today: string): StoredBooking[] {
  return readBookings()
    .filter((b) => b.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

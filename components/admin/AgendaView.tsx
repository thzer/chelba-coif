"use client";

import {
  type WeekSchedule,
  DAY_NAMES_FR,
  getDaySchedule,
  toDateString,
  toMinutes,
  toTime,
} from "@/lib/schedule";

type Appointment = {
  id: number;
  customer_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string; duration: number | null; price: number }[] | null;
};

type Props = {
  appointments: Appointment[];
  schedule: WeekSchedule;
  interval: number;
  date: string;
  onDateChange: (date: string) => void;
  onStatusChange: (id: number, status: string) => void;
  statusLabel: (status: string) => string;
  statusClass: (status: string) => string;
};

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Planning d'une journée : un rang par créneau, avec le RDV qui l'occupe. */
export function AgendaView({
  appointments,
  schedule,
  interval,
  date,
  onDateChange,
  onStatusChange,
  statusLabel,
  statusClass,
}: Props) {
  const today = toDateString(new Date());
  const day = getDaySchedule(schedule, date);

  const dayAppointments = appointments
    .filter((a) => a.appointment_date === date && a.status !== "cancelled")
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  // Bornes : horaires du jour, élargies si un RDV déborde.
  let start = day ? toMinutes(day.open) : 9 * 60;
  let end = day ? toMinutes(day.close) : 19 * 60;
  for (const a of dayAppointments) {
    const s = toMinutes(a.appointment_time.slice(0, 5));
    const e = s + (a.services?.[0]?.duration || interval);
    if (s < start) start = s;
    if (e > end) end = e;
  }

  const rows: { time: number; appointment?: Appointment; covered?: boolean }[] = [];
  const occupiedUntil = new Map<number, number>();

  for (let t = start; t < end; t += interval) {
    const a = dayAppointments.find(
      (x) => toMinutes(x.appointment_time.slice(0, 5)) === t
    );
    const coveredBy = [...occupiedUntil.entries()].find(([, until]) => t < until);
    if (a) {
      const dur = a.services?.[0]?.duration || interval;
      occupiedUntil.set(a.id, t + dur);
      rows.push({ time: t, appointment: a });
    } else if (coveredBy) {
      rows.push({ time: t, covered: true });
    } else {
      rows.push({ time: t });
    }
  }

  const isBreak = (t: number) =>
    day?.break_start &&
    day?.break_end &&
    t >= toMinutes(day.break_start) &&
    t < toMinutes(day.break_end);

  const label = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const nav =
    "min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/60 transition hover:bg-white/[0.08] hover:text-white";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onDateChange(shiftDate(date, -1))} className={nav}>
          ‹
        </button>
        <button type="button" onClick={() => onDateChange(today)} className={nav}>
          Aujourd&apos;hui
        </button>
        <button type="button" onClick={() => onDateChange(shiftDate(date, 1))} className={nav}>
          ›
        </button>

        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/25"
        />

        <p className="ml-auto text-sm capitalize text-white/50">
          {label}
          {date === today && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-white/70">
              aujourd&apos;hui
            </span>
          )}
        </p>
      </div>

      {!day && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-400">
          Le salon est fermé le {DAY_NAMES_FR[String(new Date(`${date}T12:00:00`).getDay())].toLowerCase()}
          {dayAppointments.length > 0 ? ", mais des rendez-vous existent." : "."}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
        {rows.map((row) => {
          const a = row.appointment;
          const service = a?.services?.[0];
          const breakRow = !a && !row.covered && isBreak(row.time);

          return (
            <div
              key={row.time}
              className={`flex min-h-[52px] items-stretch border-b border-white/[0.06] last:border-b-0 ${
                a ? "bg-white/[0.03]" : breakRow ? "bg-white/[0.015]" : ""
              }`}
            >
              <div className="flex w-16 shrink-0 items-center justify-center border-r border-white/[0.06] text-xs font-semibold text-white/40 sm:w-20 sm:text-sm">
                {toTime(row.time)}
              </div>

              <div className="flex min-w-0 flex-1 items-center px-3 py-2 sm:px-4">
                {a ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{a.customer_name}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(
                            a.status
                          )}`}
                        >
                          {statusLabel(a.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/40">
                        {service ? `${service.name} · ${service.duration ?? interval} min · ${service.price} DT` : "Service supprimé"}
                        {" · "}
                        {a.phone}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {a.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(a.id, "confirmed")}
                          className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
                        >
                          ✓ Confirmer
                        </button>
                      )}
                      {a.status === "confirmed" && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(a.id, "completed")}
                          className="rounded-lg bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-400/20"
                        >
                          ✓ Terminer
                        </button>
                      )}
                      {(a.status === "pending" || a.status === "confirmed") && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(a.id, "cancelled")}
                          className="rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-400/20"
                        >
                          × Annuler
                        </button>
                      )}
                    </div>
                  </div>
                ) : row.covered ? (
                  <span className="text-xs text-white/25">↳ occupé</span>
                ) : breakRow ? (
                  <span className="text-xs text-white/25">pause</span>
                ) : (
                  <span className="text-xs text-white/20">libre</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

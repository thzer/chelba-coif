"use client";

import { toDateString } from "@/lib/schedule";

type AppointmentLike = {
  appointment_date: string;
  status: string;
  services: { name: string; price: number }[] | null;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Lundi de la semaine contenant `date`. */
function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function inRange(date: string, from: Date, to: Date) {
  return date >= toDateString(from) && date < toDateString(to);
}

/**
 * Statistiques calculées côté client à partir des rendez-vous chargés.
 * Aucune requête supplémentaire.
 */
export function InsightsPanel({ appointments }: { appointments: AppointmentLike[] }) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const nextWeekStart = addDays(weekStart, 7);
  const lastWeekStart = addDays(weekStart, -7);
  const thirtyDaysAgo = addDays(now, -30);
  const tomorrow = addDays(now, 1);

  const active = (a: AppointmentLike) => a.status !== "cancelled";

  const thisWeek = appointments.filter(
    (a) => active(a) && inRange(a.appointment_date, weekStart, nextWeekStart)
  ).length;
  const lastWeek = appointments.filter(
    (a) => active(a) && inRange(a.appointment_date, lastWeekStart, weekStart)
  ).length;

  const last30 = appointments.filter((a) =>
    inRange(a.appointment_date, thirtyDaysAgo, tomorrow)
  );
  const cancelled30 = last30.filter((a) => a.status === "cancelled").length;
  const cancelRate = last30.length ? Math.round((cancelled30 / last30.length) * 100) : 0;

  const revenue30 = last30
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.services?.[0]?.price ?? 0), 0);

  const serviceCounts = new Map<string, number>();
  for (const a of last30) {
    if (!active(a)) continue;
    const name = a.services?.[0]?.name;
    if (name) serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const topServices = [...serviceCounts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);
  const topMax = topServices[0]?.[1] ?? 1;

  const delta = thisWeek - lastWeek;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
          Cette semaine
        </p>
        <div className="mt-3 flex items-end gap-3">
          <span className="text-4xl font-black">{thisWeek}</span>
          <span className="mb-1.5 text-sm text-white/40">rendez-vous</span>
        </div>
        <p
          className={`mt-2 text-xs ${
            delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-white/40"
          }`}
        >
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)} vs semaine
          dernière ({lastWeek})
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
          30 derniers jours
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-black">{revenue30}</p>
            <p className="mt-0.5 text-xs text-white/40">DT encaissés (terminés)</p>
          </div>
          <div>
            <p
              className={`text-3xl font-black ${
                cancelRate >= 25 ? "text-red-400" : ""
              }`}
            >
              {cancelRate}%
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              annulations ({cancelled30}/{last30.length})
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
          Services les plus demandés
        </p>
        {topServices.length === 0 ? (
          <p className="mt-3 text-sm text-white/30">Pas encore de données.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {topServices.map(([name, count]) => (
              <li key={name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="ml-3 shrink-0 text-white/40">{count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${Math.round((count / topMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

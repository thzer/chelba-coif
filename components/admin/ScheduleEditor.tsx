"use client";

import {
  type DaySchedule,
  type WeekSchedule,
  DAY_NAMES_FR,
  WEEK_DAYS,
  validateDay,
} from "@/lib/schedule";

type Props = {
  schedule: WeekSchedule;
  interval: number;
  onChange: (schedule: WeekSchedule, interval: number) => void;
};

const DEFAULT_OPEN_DAY: DaySchedule = {
  open: "09:00",
  close: "19:00",
  break_start: "12:30",
  break_end: "14:00",
};

const timeInput =
  "w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-sm text-white outline-none transition focus:border-white/25 disabled:opacity-30";

/** Éditeur des horaires hebdomadaires (Paramètres > Horaires d'ouverture). */
export function ScheduleEditor({ schedule, interval, onChange }: Props) {
  function updateDay(key: string, day: DaySchedule | null) {
    onChange({ ...schedule, [key]: day }, interval);
  }

  function copyToAll(key: string) {
    const source = schedule[key];
    if (!source) return;

    const next: WeekSchedule = { ...schedule };
    for (const k of WEEK_DAYS) {
      if (schedule[k]) next[k] = { ...source };
    }
    onChange(next, interval);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/35">
          Créneaux toutes les
        </label>

        <select
          value={interval}
          onChange={(e) => onChange(schedule, Number(e.target.value))}
          className="w-full max-w-[200px] rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        >
          {[15, 20, 30, 45, 60].map((v) => (
            <option key={v} value={v}>
              {v} minutes
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/35">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Jour</th>
              <th className="px-3 py-2.5 text-left font-semibold">Ouvert</th>
              <th className="px-3 py-2.5 text-left font-semibold">Ouverture</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fermeture</th>
              <th className="px-3 py-2.5 text-left font-semibold">
                Pause (début – fin)
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {WEEK_DAYS.map((key) => {
              const day = schedule[key] ?? null;
              const error = validateDay(day);

              return (
                <tr key={key} className={day ? "" : "text-white/35"}>
                  <td className="px-3 py-2.5 font-semibold">
                    {DAY_NAMES_FR[key]}
                  </td>

                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(day)}
                      onChange={(e) =>
                        updateDay(
                          key,
                          e.target.checked ? { ...DEFAULT_OPEN_DAY } : null
                        )
                      }
                      className="h-4 w-4 accent-white"
                      aria-label={`${DAY_NAMES_FR[key]} ouvert`}
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    <input
                      type="time"
                      step={300}
                      disabled={!day}
                      value={day?.open ?? ""}
                      onChange={(e) =>
                        day && updateDay(key, { ...day, open: e.target.value })
                      }
                      className={timeInput}
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    <input
                      type="time"
                      step={300}
                      disabled={!day}
                      value={day?.close ?? ""}
                      onChange={(e) =>
                        day && updateDay(key, { ...day, close: e.target.value })
                      }
                      className={timeInput}
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        step={300}
                        disabled={!day}
                        value={day?.break_start ?? ""}
                        onChange={(e) =>
                          day &&
                          updateDay(key, {
                            ...day,
                            break_start: e.target.value || null,
                          })
                        }
                        className={timeInput}
                      />
                      <span className="text-white/30">–</span>
                      <input
                        type="time"
                        step={300}
                        disabled={!day}
                        value={day?.break_end ?? ""}
                        onChange={(e) =>
                          day &&
                          updateDay(key, {
                            ...day,
                            break_end: e.target.value || null,
                          })
                        }
                        className={timeInput}
                      />
                    </div>

                    {error && (
                      <p className="mt-1 text-xs text-red-400">{error}</p>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    {day && (
                      <button
                        type="button"
                        onClick={() => copyToAll(key)}
                        title="Appliquer ces horaires à tous les jours ouverts"
                        className="whitespace-nowrap rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                      >
                        Appliquer à tous
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-white/30">
        Laissez la pause vide s&apos;il n&apos;y en a pas. Les créneaux
        proposés aux clients sont calculés automatiquement à partir de ces
        horaires et de la durée de chaque service.
      </p>
    </div>
  );
}

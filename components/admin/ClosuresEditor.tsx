"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type Closure, toDateString } from "@/lib/schedule";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-black/30";

function formatRange(c: Closure) {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return c.start_date === c.end_date
    ? fmt(c.start_date)
    : `${fmt(c.start_date)} → ${fmt(c.end_date)}`;
}

async function fetchClosures(fromDate: string): Promise<Closure[]> {
  const { data, error } = await supabase
    .from("closures")
    .select("id, start_date, end_date, reason")
    .gte("end_date", fromDate)
    .order("start_date");

  if (error) {
    console.error("Error loading closures:", error);
  }

  return data ?? [];
}

/** Vacances / jours fériés : aucune réservation possible sur ces dates. */
export function ClosuresEditor() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const today = toDateString(new Date());

  async function load() {
    setClosures(await fetchClosures(today));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    fetchClosures(today).then((rows) => {
      if (cancelled) return;
      setClosures(rows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [today]);

  async function add(e: React.FormEvent) {
    e.preventDefault();

    const end = endDate || startDate;

    if (!startDate) return;

    if (end < startDate) {
      alert("La date de fin doit être après la date de début.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("closures").insert({
      start_date: startDate,
      end_date: end,
      reason: reason.trim().slice(0, 80) || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Impossible d'ajouter cette fermeture.");
      return;
    }

    setStartDate("");
    setEndDate("");
    setReason("");
    await load();
  }

  async function remove(closure: Closure) {
    if (!confirm(`Supprimer la fermeture du ${formatRange(closure)} ?`)) return;

    const { error } = await supabase
      .from("closures")
      .delete()
      .eq("id", closure.id);

    if (error) {
      console.error(error);
      alert("Impossible de supprimer cette fermeture.");
      return;
    }

    setClosures((current) => current.filter((c) => c.id !== closure.id));
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={add}
        className="grid gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/35">
            Du
          </label>
          <input
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/35">
            Au
          </label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/35">
            Motif (optionnel)
          </label>
          <input
            type="text"
            maxLength={80}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vacances, Aïd…"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !startDate}
          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Ajout..." : "+ Ajouter"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-white/30">Chargement...</p>
      ) : closures.length === 0 ? (
        <p className="text-sm text-white/30">
          Aucune fermeture prévue. Le salon suit ses horaires habituels.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07]">
          {closures.map((closure) => (
            <li
              key={closure.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">{formatRange(closure)}</p>
                {closure.reason && (
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {closure.reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(closure)}
                className="shrink-0 rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-400/10"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

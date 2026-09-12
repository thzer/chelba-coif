"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Barber } from "@/lib/schedule";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-black/30";

type Props = {
  barbers: Barber[];
  onChange: () => Promise<void> | void;
};

/** Paramètres > Coiffeurs : ajouter, renommer, activer / désactiver. */
export function BarbersEditor({ barbers, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    const { error } = await supabase.from("barbers").insert({
      name,
      sort_order: (barbers[barbers.length - 1]?.sort_order ?? 0) + 1,
    });
    setBusy(false);

    if (error) {
      console.error(error);
      alert("Impossible d'ajouter ce coiffeur.");
      return;
    }

    setNewName("");
    await onChange();
  }

  async function rename(barber: Barber) {
    const name = editingName.trim();
    if (!name || name === barber.name) {
      setEditingId(null);
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("barbers").update({ name }).eq("id", barber.id);
    setBusy(false);

    if (error) {
      console.error(error);
      alert("Impossible de renommer ce coiffeur.");
      return;
    }

    setEditingId(null);
    await onChange();
  }

  async function toggle(barber: Barber) {
    const activeCount = barbers.filter((b) => b.active).length;

    if (barber.active && activeCount <= 1) {
      alert("Il doit rester au moins un coiffeur actif.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("barbers")
      .update({ active: !barber.active })
      .eq("id", barber.id);
    setBusy(false);

    if (error) {
      console.error(error);
      alert("Impossible de modifier ce coiffeur.");
      return;
    }

    await onChange();
  }

  async function remove(barber: Barber) {
    if (
      !confirm(
        `Supprimer "${barber.name}" ? Ses rendez-vous passés resteront visibles sans coiffeur. Préférez « Désactiver » s'il revient un jour.`
      )
    ) {
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    setBusy(false);

    if (error) {
      console.error(error);
      alert("Impossible de supprimer ce coiffeur.");
      return;
    }

    await onChange();
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07]">
        {barbers.map((barber) => (
          <li
            key={barber.id}
            className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              barber.active ? "" : "opacity-50"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                {barber.name.charAt(0).toUpperCase()}
              </span>

              {editingId === barber.id ? (
                <input
                  autoFocus
                  maxLength={60}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") rename(barber);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={`${inputClass} max-w-xs py-2`}
                />
              ) : (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{barber.name}</p>
                  <p className="text-xs text-white/35">
                    {barber.active ? "Réservable sur le site" : "Désactivé (non réservable)"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {editingId === barber.id ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => rename(barber)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(barber.id);
                      setEditingName(barber.name);
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(barber)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    {barber.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(barber)}
                    className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-400/10 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
        <input
          maxLength={60}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du nouveau coiffeur"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Ajouter
        </button>
      </form>
    </div>
  );
}

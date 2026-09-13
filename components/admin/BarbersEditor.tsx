"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Barber } from "@/lib/schedule";
import { removeImageByUrl, uploadImage, validateImageFile } from "@/lib/images";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-black/30";

const BIO_MAX = 160;

type Props = {
  barbers: Barber[];
  onChange: () => Promise<void> | void;
};

/**
 * Paramètres > Coiffeurs : photo (depuis l'appareil), nom, description,
 * activation, ajout et suppression. Chaque modification est enregistrée
 * immédiatement.
 */
export function BarbersEditor({ barbers, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<number | "new" | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setBusyId("new");
    const { error } = await supabase.from("barbers").insert({
      name,
      sort_order: (barbers[barbers.length - 1]?.sort_order ?? 0) + 1,
    });
    setBusyId(null);

    if (error) {
      console.error(error);
      alert("Impossible d'ajouter ce coiffeur.");
      return;
    }

    setNewName("");
    await onChange();
  }

  async function update(barber: Barber, patch: Partial<Barber>, failMessage: string) {
    setBusyId(barber.id);
    const { error } = await supabase.from("barbers").update(patch).eq("id", barber.id);
    setBusyId(null);

    if (error) {
      console.error(error);
      alert(failMessage);
      return false;
    }

    await onChange();
    return true;
  }

  async function toggle(barber: Barber) {
    const activeCount = barbers.filter((b) => b.active).length;

    if (barber.active && activeCount <= 1) {
      alert("Il doit rester au moins un coiffeur actif.");
      return;
    }

    await update(barber, { active: !barber.active }, "Impossible de modifier ce coiffeur.");
  }

  async function remove(barber: Barber) {
    if (
      !confirm(
        `Supprimer "${barber.name}" ? Ses rendez-vous passés resteront visibles sans coiffeur. Préférez « Désactiver » s'il revient un jour.`
      )
    ) {
      return;
    }

    setBusyId(barber.id);
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    setBusyId(null);

    if (error) {
      console.error(error);
      alert("Impossible de supprimer ce coiffeur.");
      return;
    }

    await removeImageByUrl(barber.photo_url);
    await onChange();
  }

  async function changePhoto(barber: Barber, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      alert(problem);
      return;
    }

    setBusyId(barber.id);

    try {
      const { publicUrl } = await uploadImage(file, "barbers");
      const previous = barber.photo_url;

      const { error } = await supabase
        .from("barbers")
        .update({ photo_url: publicUrl })
        .eq("id", barber.id);

      if (error) {
        await removeImageByUrl(publicUrl);
        throw error;
      }

      await removeImageByUrl(previous);
      await onChange();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload de la photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function removePhoto(barber: Barber) {
    if (!barber.photo_url) return;
    if (!confirm("Retirer la photo ?")) return;

    const previous = barber.photo_url;
    if (await update(barber, { photo_url: null }, "Impossible de retirer la photo.")) {
      await removeImageByUrl(previous);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {barbers.map((barber) => (
          <BarberCard
            key={barber.id}
            barber={barber}
            busy={busyId === barber.id}
            onSaveText={(name, bio) =>
              update(barber, { name, bio }, "Impossible d'enregistrer ce coiffeur.")
            }
            onPhoto={(e) => changePhoto(barber, e)}
            onRemovePhoto={() => removePhoto(barber)}
            onToggle={() => toggle(barber)}
            onRemove={() => remove(barber)}
          />
        ))}
      </div>

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
          disabled={busyId === "new" || !newName.trim()}
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Ajouter un coiffeur
        </button>
      </form>
    </div>
  );
}

function BarberCard({
  barber,
  busy,
  onSaveText,
  onPhoto,
  onRemovePhoto,
  onToggle,
  onRemove,
}: {
  barber: Barber;
  busy: boolean;
  onSaveText: (name: string, bio: string | null) => Promise<boolean>;
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(barber.name);
  const [bio, setBio] = useState(barber.bio ?? "");

  const dirty = name.trim() !== barber.name || (bio.trim() || null) !== (barber.bio ?? null);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-black/10 ${
        barber.active ? "" : "opacity-60"
      }`}
    >
      <div className="flex gap-4 p-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          {barber.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barber.photo_url} alt={barber.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/40">
              {barber.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className={`${inputClass} py-2 font-semibold`}
          />

          <div>
            <textarea
              maxLength={BIO_MAX}
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Description courte (ex. Spécialiste fades & dégradés)"
              className={`${inputClass} resize-none py-2 text-xs`}
            />
            <p className="mt-1 text-right text-[10px] text-white/25">
              {bio.length}/{BIO_MAX}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-3">
        <label
          className={`cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black transition hover:bg-white/90 ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {busy ? "..." : barber.photo_url ? "Changer la photo" : "+ Ajouter une photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={onPhoto}
          />
        </label>

        {barber.photo_url && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemovePhoto}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Retirer la photo
          </button>
        )}

        {dirty && (
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => onSaveText(name.trim(), bio.trim() || null)}
            className="rounded-lg bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/25 disabled:opacity-50"
          >
            ✓ Enregistrer
          </button>
        )}

        <span className="flex-1" />

        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {barber.active ? "Désactiver" : "Activer"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-400/10 disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

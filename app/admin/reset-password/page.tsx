"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MIN_LENGTH = 12;

/**
 * Page ouverte depuis le lien « Mot de passe oublié » reçu par email.
 * Supabase place une session de récupération dans l'URL ; on demande alors
 * un nouveau mot de passe.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Le lien de récupération crée une session dès le chargement.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setReady(data.session ? "ok" : "invalid");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady("ok");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("weak") ||
          error.message.toLowerCase().includes("password")
          ? "Mot de passe trop faible : mélangez lettres, chiffres et symboles."
          : "Impossible de modifier le mot de passe. Le lien a peut-être expiré."
      );
      return;
    }

    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.replace("/admin"), 2500);
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/50";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070707] px-5 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Chelba Coif" width={88} height={88} priority className="mx-auto h-22 w-22" />
          <h1 className="mt-5 text-3xl font-black tracking-tight">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-white/40">Administration Chelba Coif</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          {ready === "checking" && (
            <p className="text-center text-sm text-white/40">Vérification du lien...</p>
          )}

          {ready === "invalid" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/60">
                Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la
                page de connexion.
              </p>
              <a
                href="/admin"
                className="inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90"
              >
                Retour à la connexion
              </a>
            </div>
          )}

          {ready === "ok" && done && (
            <div className="space-y-2 text-center">
              <p className="text-lg font-bold text-emerald-400">Mot de passe modifié ✓</p>
              <p className="text-sm text-white/40">Redirection vers la connexion...</p>
            </div>
          )}

          {ready === "ok" && !done && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={`${MIN_LENGTH} caractères minimum`}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Confirmer
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••••••"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Factor = { id: string; status: "verified" | "unverified"; friendly_name?: string };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none transition placeholder:tracking-normal placeholder:text-white/20 focus:border-white/25";

async function listVerifiedTotp(): Promise<Factor | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    console.error(error);
    return null;
  }
  const verified = data.totp.find((f) => f.status === "verified");
  return verified ? (verified as Factor) : null;
}

/**
 * Paramètres > Sécurité : activation / désactivation de la double
 * authentification (application type Google Authenticator).
 */
export function SecurityPanel({ email }: { email: string | null }) {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [loading, setLoading] = useState(true);

  // Enrôlement en cours
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listVerifiedTotp().then((f) => {
      if (cancelled) return;
      setFactor(f);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    setError("");
    setBusy(true);

    // Nettoie d'éventuels facteurs non vérifiés laissés par un essai précédent.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Chelba Coif Admin",
      issuer: "Chelba Coif",
    });

    setBusy(false);

    if (error || !data) {
      console.error(error);
      setError("Impossible de démarrer l'activation. Réessayez.");
      return;
    }

    setEnrolling({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;

    setError("");
    setBusy(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.replace(/\s/g, ""),
    });

    setBusy(false);

    if (error) {
      setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
      return;
    }

    setEnrolling(null);
    setCode("");
    setFactor(await listVerifiedTotp());
  }

  async function cancelEnroll() {
    if (enrolling) {
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    }
    setEnrolling(null);
    setCode("");
    setError("");
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;

    if (
      !confirm(
        "Désactiver la double authentification ? Votre compte sera protégé uniquement par le mot de passe."
      )
    ) {
      return;
    }

    setError("");
    setBusy(true);

    // La désactivation exige une session validée par un code récent.
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ""),
    });

    if (verifyError) {
      setBusy(false);
      setError("Code incorrect.");
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });

    setBusy(false);

    if (error) {
      console.error(error);
      setError("Impossible de désactiver. Réessayez.");
      return;
    }

    setFactor(null);
    setCode("");
  }

  if (loading) {
    return <p className="text-sm text-white/30">Chargement...</p>;
  }

  if (enrolling) {
    return (
      <form onSubmit={confirmEnroll} className="space-y-5">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/60">
          <li>
            Installez une application d&apos;authentification sur votre téléphone
            (Google Authenticator, Microsoft Authenticator, Authy…).
          </li>
          <li>Scannez ce QR code avec l&apos;application.</li>
          <li>Saisissez le code à 6 chiffres affiché pour terminer.</li>
        </ol>

        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <div className="rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolling.qr} alt="QR code 2FA" width={180} height={180} />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs text-white/40">
              Impossible de scanner ? Saisissez cette clé manuellement :
            </p>
            <code className="block break-all rounded-lg bg-black/30 px-3 py-2 text-xs text-white/70">
              {enrolling.secret}
            </code>

            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              className={inputClass}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || code.replace(/\s/g, "").length < 6}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {busy ? "Vérification..." : "Activer la 2FA"}
              </button>
              <button
                type="button"
                onClick={cancelEnroll}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  if (factor) {
    return (
      <form onSubmit={disable} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
          <span className="text-emerald-400">●</span>
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Double authentification activée
            </p>
            <p className="text-xs text-emerald-400/70">
              Un code de votre application est demandé à chaque connexion
              {email ? ` de ${email}` : ""}.
            </p>
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm text-white/40 hover:text-white">
            Désactiver la double authentification
          </summary>
          <div className="mt-3 flex flex-col gap-3 sm:max-w-sm">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              className={inputClass}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.replace(/\s/g, "").length < 6}
              className="rounded-xl border border-red-400/20 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-400/10 disabled:opacity-50"
            >
              {busy ? "..." : "Désactiver"}
            </button>
          </div>
        </details>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/50">
        Ajoutez une seconde barrière : en plus du mot de passe, un code
        temporaire généré par une application sur votre téléphone sera demandé
        à chaque connexion. Même si votre mot de passe fuite, personne ne
        pourra accéder à l&apos;administration sans votre téléphone.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={startEnroll}
        disabled={busy}
        className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
      >
        {busy ? "..." : "Activer la double authentification"}
      </button>
    </div>
  );
}

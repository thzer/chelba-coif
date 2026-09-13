"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "denied" | "off" | "on";

/**
 * Paramètres > Notifications : reçoit une notification push sur cet appareil
 * à chaque nouvelle réservation.
 */
export function NotificationsPanel({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  async function refresh() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();

    // Synchronise l'abonnement local avec la base (au cas où il aurait été perdu).
    if (subscription) {
      await saveSubscription(subscription);
    }

    setStatus(subscription ? "on" : "off");

    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true });
    setDeviceCount(count ?? 0);
  }

  useEffect(() => {
    let cancelled = false;

    // Détection différée pour ne pas modifier l'état de façon synchrone.
    Promise.resolve().then(() => {
      if (cancelled) return;
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsIosBrowser(ios && !standalone);

      return refresh().catch((e) => {
        console.error(e);
        if (!cancelled) setStatus("unsupported");
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSubscription(subscription: PushSubscription) {
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;
  }

  async function enable() {
    setError("");
    setBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      await saveSubscription(subscription);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("Activation impossible sur cet appareil. Réessayez ou utilisez Chrome.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError("");
    setBusy(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }

      await refresh();
    } catch (e) {
      console.error(e);
      setError("Désactivation impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    await registration?.showNotification("🔔 Nouvelle réservation (test)", {
      body: "Ahmed Ben Ali — samedi 20 septembre à 10:00 · Low Fade · avec Hamza",
      icon: "/icon.png",
      tag: "test",
    });
  }

  const primary =
    "rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50";
  const secondary =
    "rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50";

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/50">
        Recevez une notification sur votre téléphone ou votre ordinateur à
        chaque nouvelle demande de rendez-vous, même si cette page est fermée.
        À activer sur chaque appareil où vous voulez être prévenu.
      </p>

      {isIosBrowser && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          Sur iPhone, ajoutez d&apos;abord cette page à l&apos;écran d&apos;accueil
          (Partager → « Sur l&apos;écran d&apos;accueil »), puis ouvrez-la depuis
          l&apos;icône pour activer les notifications.
        </div>
      )}

      {status === "checking" && <p className="text-sm text-white/30">Vérification...</p>}

      {status === "unsupported" && (
        <p className="text-sm text-white/40">
          Ce navigateur ne prend pas en charge les notifications. Utilisez Chrome
          (Android / ordinateur) ou Safari sur iPhone après installation sur
          l&apos;écran d&apos;accueil.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-red-400">
          Les notifications sont bloquées pour ce site dans les réglages du
          navigateur. Autorisez-les dans les paramètres du site, puis rechargez.
        </p>
      )}

      {(status === "on" || status === "off") && (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
              status === "on"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/50"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "on" ? "bg-emerald-400" : "bg-white/30"}`} />
            {status === "on" ? "Activées sur cet appareil" : "Désactivées sur cet appareil"}
          </span>

          {deviceCount !== null && (
            <span className="text-xs text-white/35">
              {deviceCount} appareil{deviceCount > 1 ? "s" : ""} abonné{deviceCount > 1 ? "s" : ""} au total
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "off" && (
          <button type="button" onClick={enable} disabled={busy} className={primary}>
            {busy ? "Activation..." : "🔔 Activer sur cet appareil"}
          </button>
        )}

        {status === "on" && (
          <>
            <button type="button" onClick={sendTest} disabled={busy} className={primary}>
              Envoyer une notification test
            </button>
            <button type="button" onClick={disable} disabled={busy} className={secondary}>
              Désactiver sur cet appareil
            </button>
          </>
        )}
      </div>
    </div>
  );
}

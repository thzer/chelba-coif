"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Dictionary } from "@/lib/i18n";
import type { ToastKind } from "@/components/Toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * « Me rappeler la veille » : le client accepte les notifications, son
 * abonnement est rattaché au rendez-vous (via le jeton) et le planificateur
 * lui envoie un rappel 24 h avant.
 */
export function ReminderOptIn({
  token,
  t,
  notify,
  compact = false,
}: {
  token: string;
  t: Dictionary;
  notify: (kind: ToastKind, title: string, text?: string) => void;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<"checking" | "unsupported" | "off" | "on">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (cancelled) return;

      if (sub) {
        // Déjà abonné sur cet appareil : on s'assure que ce RDV est rattaché.
        const json = sub.toJSON();
        const { data } = await supabase.rpc("register_client_reminder", {
          p_token: token,
          p_endpoint: json.endpoint,
          p_p256dh: json.keys?.p256dh,
          p_auth: json.keys?.auth,
        });
        if (!cancelled) setStatus(data === true ? "on" : "off");
      } else {
        setStatus("off");
      }
    })().catch(() => !cancelled && setStatus("unsupported"));

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        notify("info", t.reminder_denied_title, t.reminder_denied_text);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = sub.toJSON();
      const { data, error } = await supabase.rpc("register_client_reminder", {
        p_token: token,
        p_endpoint: json.endpoint,
        p_p256dh: json.keys?.p256dh,
        p_auth: json.keys?.auth,
      });

      if (error || data !== true) throw error ?? new Error("register failed");

      setStatus("on");
      notify("success", t.reminder_on_title, t.reminder_on_text);
    } catch (e) {
      console.error(e);
      notify("error", t.err_generic_title, t.reminder_error_text);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await supabase.rpc("unregister_client_reminder", { p_token: token });
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return compact ? null : (
      <p className="mt-6 text-xs leading-5 text-white/30">{t.reminder_unsupported}</p>
    );
  }

  return (
    <div
      className={`mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        status === "on"
          ? "border-emerald-400/20 bg-emerald-400/[0.06]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3">
        {status === "on" ? (
          <Bell size={18} className="mt-0.5 shrink-0 text-emerald-400" />
        ) : (
          <BellOff size={18} className="mt-0.5 shrink-0 text-white/40" />
        )}
        <div>
          <p className="text-sm font-bold">
            {status === "on" ? t.reminder_on_title : t.reminder_offer_title}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-white/45">
            {status === "on" ? t.reminder_on_text : t.reminder_offer_text}
          </p>
        </div>
      </div>

      {status === "on" ? (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {t.reminder_disable}
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {busy ? "…" : t.reminder_enable}
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Check, Clock, MessageCircle, Scissors, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Lang, DEFAULT_LANG, LANGS, dictionaries, isLang, langMeta } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { ToastViewport, useToasts } from "@/components/Toast";
import { ReminderOptIn } from "@/components/ReminderOptIn";
import { removeBooking, saveBooking } from "@/lib/myBookings";

type AppointmentView = {
  id: number;
  customer_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service: string | null;
  price: number | null;
  duration: number | null;
  barber: string | null;
  cancel_deadline: string;
  can_cancel: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchAppointment(token: string): Promise<AppointmentView | null> {
  if (!UUID.test(token)) return null;

  const { data, error } = await supabase.rpc("get_appointment_by_token", { p_token: token });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return (row as AppointmentView | undefined) ?? null;
}

/** Page publique « Mon rendez-vous » : détails + annulation + rappel. */
export default function AppointmentPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const t = dictionaries[lang];
  const { locale, dir } = langMeta(lang);
  const { toasts, notify, dismiss } = useToasts();

  const [state, setState] = useState<"loading" | "ok" | "not_found">("loading");
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [salonWhatsapp, setSalonWhatsapp] = useState("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("whatsapp")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setSalonWhatsapp(data?.whatsapp ?? ""));
  }, []);

  useEffect(() => {
    let initial: Lang = DEFAULT_LANG;
    try {
      const saved = localStorage.getItem("lang");
      if (isLang(saved)) initial = saved;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  async function load() {
    const result = await fetchAppointment(token);
    setAppointment(result);
    setState(result ? "ok" : "not_found");
  }

  useEffect(() => {
    let cancelled = false;
    fetchAppointment(token).then((result) => {
      if (cancelled) return;
      setAppointment(result);
      setState(result ? "ok" : "not_found");

      // Mémorise le RDV sur cet appareil (bouton « Mes rendez-vous » du site).
      if (result && (result.status === "pending" || result.status === "confirmed")) {
        saveBooking({
          token,
          date: result.appointment_date,
          time: result.appointment_time,
          service: result.service ?? "",
          barber: result.barber ?? "",
        });
      } else if (result) {
        removeBooking(token);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function cancel() {
    setCancelling(true);

    const { data, error } = await supabase.rpc("cancel_appointment_by_token", { p_token: token });

    setCancelling(false);
    setConfirming(false);

    if (error) {
      notify("error", t.err_generic_title, t.err_generic_text);
      return;
    }

    if (data === "cancelled") {
      removeBooking(token);
      notify("success", t.rdv_cancelled_title, t.rdv_cancelled_text);
      await load();
    } else if (data === "too_late") {
      notify("error", t.rdv_too_late_title, t.rdv_too_late_text);
      await load();
    } else {
      notify("error", t.rdv_not_cancellable_title, t.rdv_not_cancellable_text);
      await load();
    }
  }

  const statusLabel: Record<string, string> = {
    pending: t.rdv_status_pending,
    confirmed: t.rdv_status_confirmed,
    completed: t.rdv_status_completed,
    cancelled: t.rdv_status_cancelled,
  };

  const statusClass: Record<string, string> = {
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-400",
    confirmed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    completed: "border-blue-400/20 bg-blue-400/10 text-blue-400",
    cancelled: "border-red-400/20 bg-red-400/10 text-red-400",
  };

  const longDate = appointment
    ? new Date(`${appointment.appointment_date}T12:00:00`).toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const deadline = appointment
    ? new Date(appointment.cancel_deadline).toLocaleString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-10 text-white sm:py-16">
      <ToastViewport toasts={toasts} onDismiss={dismiss} closeLabel={t.close} />

      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black tracking-[0.2em]">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
            CHELBA COIF
          </Link>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-[11px] font-bold">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code);
                  try {
                    localStorage.setItem("lang", l.code);
                  } catch {}
                }}
                className={`rounded-full px-2.5 py-1 transition ${
                  lang === l.code ? "bg-white text-black" : "text-white/50 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#151515] shadow-2xl">
          <div className="border-b border-white/10 px-6 py-6 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/30">Chelba Coif</p>
            <h1 className="mt-2 text-3xl font-black uppercase">{t.rdv_title}</h1>
          </div>

          {state === "loading" && (
            <p className="px-6 py-10 text-center text-sm text-white/40">{t.rdv_loading}</p>
          )}

          {state === "not_found" && (
            <div className="px-6 py-10 text-center sm:px-8">
              <p className="text-lg font-bold">{t.rdv_not_found_title}</p>
              <p className="mt-2 text-sm text-white/40">{t.rdv_not_found_text}</p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-black"
              >
                {t.rdv_back_home}
              </Link>
            </div>
          )}

          {state === "ok" && appointment && (
            <div className="px-6 py-6 sm:px-8">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  statusClass[appointment.status] ?? statusClass.pending
                }`}
              >
                {appointment.status === "cancelled" ? <X size={12} /> : <Check size={12} />}
                {statusLabel[appointment.status] ?? appointment.status}
              </span>

              {appointment.status === "pending" && (
                <p className="mt-3 text-sm text-white/45">{t.rdv_pending_hint}</p>
              )}

              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Scissors size={17} className="mt-0.5 shrink-0 text-white/40" />
                  <div>
                    <dt className="text-white/35">{t.sum_service}</dt>
                    <dd className="font-semibold">
                      {appointment.service ?? "—"}
                      {appointment.price != null && (
                        <span className="ml-2 text-white/50">
                          {appointment.price} {t.currency}
                        </span>
                      )}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarDays size={17} className="mt-0.5 shrink-0 text-white/40" />
                  <div>
                    <dt className="text-white/35">{t.sum_date}</dt>
                    <dd className="font-semibold capitalize">{longDate}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock size={17} className="mt-0.5 shrink-0 text-white/40" />
                  <div>
                    <dt className="text-white/35">{t.sum_time}</dt>
                    <dd className="font-semibold">
                      {appointment.appointment_time}
                      {appointment.duration ? (
                        <span className="ml-2 text-white/50">
                          · {appointment.duration} {t.minutes}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </div>

                {appointment.barber && (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-[17px] shrink-0 text-center text-white/40">💈</span>
                    <div>
                      <dt className="text-white/35">{t.sum_barber}</dt>
                      <dd className="font-semibold">{appointment.barber}</dd>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-[17px] shrink-0 text-center text-white/40">👤</span>
                  <div>
                    <dt className="text-white/35">{t.sum_client}</dt>
                    <dd className="font-semibold">
                      {appointment.customer_name}
                      <span className="ml-2 text-white/50" dir="ltr">
                        {formatPhone(appointment.phone)}
                      </span>
                    </dd>
                  </div>
                </div>
              </dl>

              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <ReminderOptIn token={token} t={t} notify={notify} />
              )}

              <div className="mt-8 border-t border-white/10 pt-6">
                {appointment.can_cancel ? (
                  confirming ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-5">
                      <p className="font-bold">{t.rdv_cancel_confirm_title}</p>
                      <p className="mt-1 text-sm text-white/50">{t.rdv_cancel_confirm_text}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={cancel}
                          disabled={cancelling}
                          className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                        >
                          {cancelling ? "…" : t.rdv_cancel_yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(false)}
                          className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                        >
                          {t.rdv_cancel_no}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="w-full rounded-xl border border-red-400/30 py-3.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
                      >
                        {t.rdv_cancel_button}
                      </button>
                      <p className="mt-2 text-center text-xs text-white/30">
                        {t.rdv_cancel_until} {deadline}
                      </p>
                    </>
                  )
                ) : appointment.status === "pending" || appointment.status === "confirmed" ? (
                  <p className="text-center text-sm text-white/40">{t.rdv_too_late_text}</p>
                ) : null}

                <a
                  href={`https://wa.me/${salonWhatsapp.replace(/D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <MessageCircle size={17} />
                  {t.rdv_contact_salon}
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/25">{t.rdv_keep_link}</p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/schedule";
import { clientMessages, whatsappUrl } from "@/lib/whatsapp";
import { formatPhone } from "@/lib/phone";

type Appointment = {
  id: number;
  customer_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  cancel_token: string | null;
  client_reminder_sent_at?: string | null;
  services: { name: string; duration: number | null; price: number }[] | null;
  barbers: { name: string }[] | null;
};

type Props = {
  appointments: Appointment[];
  siteUrl: string;
  shopName: string;
};

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/**
 * Rendez-vous d'aujourd'hui et de demain : qui a un rappel automatique
 * (push) et à qui envoyer un rappel WhatsApp en un clic.
 */
export function RemindersPanel({ appointments, siteUrl, shopName }: Props) {
  const today = toDateString(new Date());
  const tomorrow = addDays(today, 1);

  const [withPush, setWithPush] = useState<Set<number>>(new Set());
  const [sentIds, setSentIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`reminders-sent-${today}`);
      return new Set<number>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const upcoming = appointments
    .filter(
      (a) =>
        (a.status === "pending" || a.status === "confirmed") &&
        (a.appointment_date === today || a.appointment_date === tomorrow)
    )
    .sort((a, b) =>
      `${a.appointment_date}${a.appointment_time}`.localeCompare(
        `${b.appointment_date}${b.appointment_time}`
      )
    );

  useEffect(() => {
    const ids = upcoming.map((a) => a.id);
    if (ids.length === 0) return;

    let cancelled = false;
    supabase
      .from("client_push_subscriptions")
      .select("appointment_id")
      .in("appointment_id", ids)
      .then(({ data }) => {
        if (cancelled) return;
        setWithPush(new Set((data ?? []).map((r) => r.appointment_id as number)));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments.length, today]);

  function markSent(id: number) {
    const next = new Set(sentIds);
    next.add(id);
    setSentIds(next);
    try {
      localStorage.setItem(`reminders-sent-${today}`, JSON.stringify([...next]));
    } catch {}
  }

  const groups = [
    { label: "Aujourd'hui", date: today },
    { label: "Demain", date: tomorrow },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-sm leading-6 text-white/50">
        Les clients qui ont activé le <strong className="text-white/80">rappel automatique</strong> reçoivent
        une notification la veille sans rien faire. Pour les autres, envoyez le rappel WhatsApp en un clic
        (idéalement la veille au soir pour les RDV de demain).
      </div>

      {groups.map((group) => {
        const items = upcoming.filter((a) => a.appointment_date === group.date);

        return (
          <div key={group.date}>
            <div className="mb-3 flex items-baseline gap-3">
              <h4 className="text-lg font-black">{group.label}</h4>
              <span className="text-xs text-white/35">
                {new Date(`${group.date}T12:00:00`).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {" · "}
                {items.length} rendez-vous
              </span>
            </div>

            {items.length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] px-4 py-4 text-sm text-white/30">
                Aucun rendez-vous.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08]">
                {items.map((a) => {
                  const auto = withPush.has(a.id);
                  const sent = sentIds.has(a.id) || Boolean(a.client_reminder_sent_at);
                  const service = a.services?.[0];
                  const href = whatsappUrl(
                    a.phone,
                    clientMessages.reminder({
                      customer_name: a.customer_name,
                      appointment_date: a.appointment_date,
                      appointment_time: a.appointment_time,
                      service: service?.name,
                      barber: a.barbers?.[0]?.name,
                      shopName,
                      manageUrl: a.cancel_token ? `${siteUrl}/rdv/${a.cancel_token}` : null,
                    })
                  );

                  return (
                    <li
                      key={a.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-12 shrink-0 text-sm font-bold text-white/60">
                          {a.appointment_time.slice(0, 5)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{a.customer_name}</p>
                          <p className="truncate text-xs text-white/40" dir="ltr">
                            {formatPhone(a.phone)}
                            {service ? ` · ${service.name}` : ""}
                            {a.barbers?.[0] ? ` · ${a.barbers[0].name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {auto ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            🔔 Rappel auto
                          </span>
                        ) : sent ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
                            ✓ Rappel envoyé
                          </span>
                        ) : null}

                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => markSent(a.id)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              auto || sent
                                ? "bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white"
                                : "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
                            }`}
                          >
                            📲 Rappel WhatsApp
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

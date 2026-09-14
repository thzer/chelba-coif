import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * Appelée toutes les 15 min par la base (pg_cron → run_reminders → pg_net).
 * Envoie :
 *  - aux clients abonnés : rappel 24 h avant leur rendez-vous
 *  - au salon : rappel 30 min avant chaque rendez-vous, et un récap à 08:00
 */

export const runtime = "nodejs";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

type Payload = {
  client_reminders: {
    customer_name: string;
    appointment_date: string;
    appointment_time: string;
    service: string | null;
    barber: string | null;
    url: string;
    subscriptions: Sub[] | null;
  }[];
  barber_reminders: {
    customer_name: string;
    appointment_time: string;
    service: string | null;
    barber: string | null;
    phone: string;
  }[];
  summary: {
    date: string;
    count: number;
    first_time: string | null;
    manual_reminders: number;
  } | null;
  admin_subscriptions: Sub[];
};

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function frDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

async function sendAll(subs: Sub[], payload: object) {
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, body, { TTL: 60 * 60 * 6, urgency: "high" }))
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

export async function POST(request: Request) {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!secret || !publicKey || !privateKey) {
    return NextResponse.json({ error: "Notifications not configured" }, { status: 503 });
  }

  if (!timingSafeEqual(request.headers.get("x-webhook-secret") ?? "", secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  webpush.setVapidDetails("mailto:chelbacoif@gmail.com", publicKey, privateKey);

  let clientsSent = 0;
  let barberSent = 0;

  // Rappels clients (dans la langue du site par défaut : FR).
  for (const item of payload.client_reminders ?? []) {
    if (!item.subscriptions?.length) continue;
    clientsSent += await sendAll(item.subscriptions, {
      title: "💈 Rappel : rendez-vous demain",
      body: `${frDate(item.appointment_date)} à ${item.appointment_time}${
        item.service ? ` · ${item.service}` : ""
      }${item.barber ? ` · avec ${item.barber}` : ""} — Chelba Coif`,
      url: item.url,
      tag: `client-reminder-${item.url.slice(-8)}`,
    });
  }

  const adminSubs = payload.admin_subscriptions ?? [];

  // Rappels barbier 30 min avant.
  for (const item of payload.barber_reminders ?? []) {
    if (!adminSubs.length) break;
    barberSent += await sendAll(adminSubs, {
      title: `⏰ Dans 30 min : ${item.customer_name}`,
      body: `${item.appointment_time}${item.service ? ` · ${item.service}` : ""}${
        item.barber ? ` · ${item.barber}` : ""
      } · ${item.phone}`,
      url: "/admin",
      tag: `barber-reminder-${item.appointment_time}-${item.customer_name}`,
    });
  }

  // Récap du matin.
  if (payload.summary && adminSubs.length) {
    const s = payload.summary;
    const body =
      s.count === 0
        ? "Aucun rendez-vous aujourd'hui."
        : `${s.count} rendez-vous, premier à ${s.first_time}.${
            s.manual_reminders > 0
              ? ` ${s.manual_reminders} rappel${s.manual_reminders > 1 ? "s" : ""} WhatsApp à envoyer.`
              : ""
          }`;
    barberSent += await sendAll(adminSubs, {
      title: `☀️ ${frDate(s.date)}`,
      body,
      url: "/admin?view=reminders",
      tag: `summary-${s.date}`,
    });
  }

  return NextResponse.json({ clientsSent, barberSent });
}

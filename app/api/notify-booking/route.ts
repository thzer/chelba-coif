import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * Appelée par la base (trigger `notify_new_booking` via pg_net) à chaque
 * nouvelle réservation. Envoie une notification push à tous les appareils
 * admin abonnés. Aucune donnée n'est lue ici : la base envoie tout.
 */

export const runtime = "nodejs";

type Payload = {
  appointment: {
    id: number;
    customer_name: string;
    appointment_date: string;
    appointment_time: string;
    service: string | null;
    barber: string | null;
  };
  subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[];
};

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!secret || !publicKey || !privateKey) {
    return NextResponse.json({ error: "Notifications not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { appointment, subscriptions } = payload;
  if (!appointment || !Array.isArray(subscriptions)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  webpush.setVapidDetails("mailto:chelbacoif@gmail.com", publicKey, privateKey);

  const date = new Date(`${appointment.appointment_date}T12:00:00`).toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" }
  );

  const notification = JSON.stringify({
    title: "🔔 Nouvelle réservation",
    body: `${appointment.customer_name} — ${date} à ${appointment.appointment_time}${
      appointment.service ? ` · ${appointment.service}` : ""
    }${appointment.barber ? ` · avec ${appointment.barber}` : ""}`,
    url: "/admin",
    tag: `booking-${appointment.id}`,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, notification, { TTL: 60 * 60 * 24, urgency: "high" })
    )
  );

  // Abonnements morts (appareil désabonné) : renvoyés pour information ;
  // l'admin les nettoie à sa prochaine ouverture.
  const gone = results
    .map((r, i) => (r.status === "rejected" && [404, 410].includes(r.reason?.statusCode) ? subscriptions[i].endpoint : null))
    .filter(Boolean);

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, failed: results.length - sent, gone });
}

/** Lien wa.me vers un numéro, avec message pré-rempli. */
export function whatsappUrl(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

type AppointmentInfo = {
  customer_name: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM(:SS)
  service?: string | null;
  barber?: string | null;
  shopName?: string;
};

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "";
}

/** Messages envoyés par le salon au client (depuis l'admin). */
export const clientMessages = {
  confirmed: (a: AppointmentInfo) =>
    `Bonjour ${firstName(a.customer_name)} 👋\n\nVotre rendez-vous chez ${
      a.shopName ?? "Chelba Coif"
    } est confirmé ✅\n\n📅 ${formatDate(a.appointment_date)}\n🕐 ${a.appointment_time.slice(
      0,
      5
    )}${a.service ? `\n✂️ ${a.service}` : ""}${a.barber ? `\n💈 ${a.barber}` : ""}\n\nÀ bientôt !`,

  reminder: (a: AppointmentInfo) =>
    `Bonjour ${firstName(a.customer_name)} 👋\n\nPetit rappel : votre rendez-vous chez ${
      a.shopName ?? "Chelba Coif"
    } est ${formatDate(a.appointment_date)} à ${a.appointment_time.slice(0, 5)}${
      a.service ? ` (${a.service})` : ""
    }${a.barber ? ` avec ${a.barber}` : ""}.\n\nÀ tout à l'heure !`,

  cancelled: (a: AppointmentInfo) =>
    `Bonjour ${firstName(a.customer_name)},\n\nNous sommes désolés, votre rendez-vous du ${formatDate(
      a.appointment_date
    )} à ${a.appointment_time.slice(0, 5)} chez ${
      a.shopName ?? "Chelba Coif"
    } a dû être annulé.\n\nN'hésitez pas à réserver un autre créneau. Merci de votre compréhension 🙏`,

  pending: (a: AppointmentInfo) =>
    `Bonjour ${firstName(a.customer_name)} 👋\n\nNous avons bien reçu votre demande de rendez-vous pour ${formatDate(
      a.appointment_date
    )} à ${a.appointment_time.slice(0, 5)}. Nous revenons vers vous très vite pour la confirmer.`,
};

export type ClientMessageKind = keyof typeof clientMessages;

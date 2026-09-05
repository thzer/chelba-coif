"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Appointment = {
  id: number;
  customer_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: {
    name: string;
    duration: number;
    price: number;
  }[] | null;
};

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAppointments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        phone,
        appointment_date,
        appointment_time,
        status,
        services (
          name,
          duration,
          price
        )
      `)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Error loading appointments:", error);
      setLoading(false);
      return;
    }

    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/admin";
        return;
      }

      loadAppointments();
    }

    checkAuth();
  }, []);

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating appointment:", error);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? { ...appointment, status }
          : appointment
      )
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "confirmed":
        return "Confirmé";
      case "cancelled":
        return "Annulé";
      case "completed":
        return "Terminé";
      default:
        return "En attente";
    }
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">Chelba Coif</h1>
            <p className="text-sm text-white/50">Administration</p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Rendez-vous</h2>
          <p className="mt-2 text-white/50">
            Gérez les réservations de vos clients.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Chargement...
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Aucun rendez-vous pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const service = appointment.services?.[0];

              return (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {appointment.customer_name}
                        </h3>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>

                      <a
                        href={`tel:${appointment.phone}`}
                        className="mt-2 inline-block text-sm text-white/50 transition hover:text-white"
                      >
                        📱 {appointment.phone}
                      </a>

                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <span className="rounded-lg bg-white/10 px-3 py-2">
                          📅 {formatDate(appointment.appointment_date)}
                        </span>

                        <span className="rounded-lg bg-white/10 px-3 py-2">
                          🕐 {appointment.appointment_time.slice(0, 5)}
                        </span>

                        <span className="rounded-lg bg-white/10 px-3 py-2">
                          ✂️ {service?.name ?? "Service"}
                        </span>

                        {service && (
                          <span className="rounded-lg bg-white/10 px-3 py-2">
                            {service.price} DT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          updateStatus(appointment.id, "confirmed")
                        }
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]"
                      >
                        Confirmer
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(appointment.id, "completed")
                        }
                        className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
                      >
                        Terminé
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(appointment.id, "cancelled")
                        }
                        className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
                      >
                        Annuler
                      </button>

                      <a
                        href={`https://wa.me/${appointment.phone.replace(
                          /\D/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-green-400/30 px-4 py-2 text-sm text-green-400 transition hover:bg-green-400/10"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Section =
  | "dashboard"
  | "appointments"
  | "services"
  | "gallery"
  | "reviews"
  | "settings";
  type Appointment = {
  id: number;
  customer_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: {
    name: string;
    duration: number | null;
    price: number;
  }[] | null;
};
type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number | null;
  image_url: string | null;
  active: boolean;
};
type GalleryImage = {
  id: number;
  image_url: string;
  title: string | null;
  active: boolean;
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("dashboard");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
const [appointmentsLoading, setAppointmentsLoading] = useState(false);
const [servicesCount, setServicesCount] = useState(0);
const [reviewsCount, setReviewsCount] = useState(0);
const [services, setServices] = useState<Service[]>([]);
const [servicesLoading, setServicesLoading] = useState(false);
const [showServiceForm, setShowServiceForm] = useState(false);

const [serviceName, setServiceName] = useState("");
const [serviceDescription, setServiceDescription] = useState("");
const [servicePrice, setServicePrice] = useState("");
const [serviceDuration, setServiceDuration] = useState("");
const [serviceImage, setServiceImage] = useState("");
const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
const [galleryLoading, setGalleryLoading] = useState(false);
const [uploadingImage, setUploadingImage] = useState(false);
const [galleryTitle, setGalleryTitle] = useState("");
const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
const [editingGalleryTitle, setEditingGalleryTitle] = useState("");
const [replacingGalleryId, setReplacingGalleryId] = useState<number | null>(null);
const today = new Date().toISOString().split("T")[0];

const todayAppointments = appointments.filter(
  (appointment) =>
    appointment.appointment_date === today &&
    appointment.status !== "cancelled"
);

const pendingAppointments = appointments.filter(
  (appointment) => appointment.status === "pending"
);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  async function loadAppointments() {
  setAppointmentsLoading(true);

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
    setAppointmentsLoading(false);
    return;
  }

  setAppointments((data as Appointment[]) ?? []);
  setAppointmentsLoading(false);
}
async function loadDashboardStats() {
  const { count: servicesCount } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  const { count: reviewsCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  setServicesCount(servicesCount ?? 0);
  setReviewsCount(reviewsCount ?? 0);
}
async function loadServices() {
  setServicesLoading(true);

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading services:", error);
    setServicesLoading(false);
    return;
  }

  setServices((data as Service[]) ?? []);
  setServicesLoading(false);
}
async function loadGallery() {
  setGalleryLoading(true);

  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error loading gallery:", error);
    setGalleryLoading(false);
    return;
  }

  setGalleryImages((data as GalleryImage[]) ?? []);
  setGalleryLoading(false);
}

async function updateAppointmentStatus(
  id: number,
  status: string
) {
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Error updating appointment:", error);
    alert("Erreur lors de la modification.");
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

function formatAppointmentDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "fr-FR",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  );
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

  useEffect(() => {
   async function checkUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  setUser(user);

  if (user) {
  loadAppointments();
  loadDashboardStats();
  loadServices();
  loadGallery();
}

  setLoading(false);
}

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoginLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoginLoading(false);
      return;
    }

    setUser(data.user);
await loadAppointments();
await loadDashboardStats();
await loadServices();
await loadGallery();
setLoginLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Chargement...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-black">
              C
            </div>

            <h1 className="text-3xl font-bold">
              Chelba Coif
            </h1>

            <p className="mt-2 text-white/50">
              Espace administration
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl"
          >
            <h2 className="mb-6 text-xl font-semibold">
              Connexion
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
                  placeholder="admin@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Mot de passe
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50"
              >
                {loginLoading ? "Connexion..." : "Se connecter"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  const menu = [
    {
      id: "dashboard" as Section,
      label: "Dashboard",
      icon: "📊",
    },
    {
      id: "appointments" as Section,
      label: "Rendez-vous",
      icon: "📅",
    },
    {
      id: "services" as Section,
      label: "Services",
      icon: "✂️",
    },
    {
      id: "gallery" as Section,
      label: "Galerie",
      icon: "🖼️",
    },
    {
      id: "reviews" as Section,
      label: "Avis clients",
      icon: "⭐",
    },
    {
      id: "settings" as Section,
      label: "Paramètres",
      icon: "⚙️",
    },
  ];

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 border-r border-white/10 bg-black lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-black">
                C
              </div>

              <div>
                <h1 className="font-bold">
                  Chelba Coif
                </h1>

                <p className="text-xs text-white/40">
                  Administration
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  section === item.id
                    ? "bg-white text-black"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              🚪
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1">
          <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold">
                {menu.find((item) => item.id === section)?.label}
              </h2>

              <p className="text-sm text-white/40">
                Gestion de votre salon
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10"
            >
              Déconnexion
            </button>
          </header>

          <div className="p-6 lg:p-10">

            {/* DASHBOARD */}
            {section === "dashboard" && (
              <div>
                <div className="mb-8">
                  <h3 className="text-3xl font-bold">
                    Bonjour 👋
                  </h3>

                  <p className="mt-2 text-white/40">
                    Voici un aperçu de Chelba Coif.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/40">
                      Aujourd'hui
                    </p>

                    <p className="mt-3 text-3xl font-bold">
                      {todayAppointments.length}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      rendez-vous
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/40">
                      En attente
                    </p>

                    <p className="mt-3 text-3xl font-bold">
                      {pendingAppointments.length}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      réservations
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/40">
                      Services
                    </p>

                    <p className="mt-3 text-3xl font-bold">
                      {servicesCount}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      prestations
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/40">
                      Avis
                    </p>

                    <p className="mt-3 text-3xl font-bold">
                      {reviewsCount}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      avis clients
                    </p>
                  </div>

                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold">
        Rendez-vous récents
      </h3>

      <p className="mt-1 text-sm text-white/40">
        Les dernières réservations de vos clients.
      </p>
    </div>

    <button
      onClick={() => setSection("appointments")}
      className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/20 hover:text-white"
    >
      Voir tout
    </button>
  </div>

  <div className="mt-6 space-y-3">
    {appointments.length === 0 ? (
      <p className="text-sm text-white/30">
        Aucun rendez-vous pour le moment.
      </p>
    ) : (
      appointments.slice(0, 5).map((appointment) => {
        const service = appointment.services?.[0];

        return (
          <div
            key={appointment.id}
            className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {appointment.customer_name}
              </p>

              <p className="mt-1 text-xs text-white/40">
                {service?.name ?? "Service"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm">
                  {formatAppointmentDate(
                    appointment.appointment_date
                  )}
                </p>

                <p className="text-xs text-white/40">
                  {appointment.appointment_time.slice(0, 5)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  appointment.status === "confirmed"
                    ? "bg-green-500/10 text-green-400"
                    : appointment.status === "cancelled"
                    ? "bg-red-500/10 text-red-400"
                    : appointment.status === "completed"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
              </div>
            )}

            {/* OTHER SECTIONS */}
           {section === "appointments" && (
  <div>
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h3 className="text-3xl font-bold">
          Rendez-vous
        </h3>

        <p className="mt-2 text-white/40">
          Gestion des réservations clients.
        </p>
      </div>

      <button
        onClick={loadAppointments}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        ↻ Actualiser
      </button>
    </div>

    {appointmentsLoading ? (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <p className="text-white/40">
          Chargement des rendez-vous...
        </p>
      </div>
    ) : appointments.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="text-4xl">📅</div>

        <p className="mt-4 text-white/60">
          Aucun rendez-vous pour le moment.
        </p>

        <p className="mt-2 text-sm text-white/30">
          Les réservations faites depuis le site apparaîtront ici.
        </p>
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

                <div className="space-y-3">
                  <div>
                    <h4 className="text-lg font-semibold">
                      {appointment.customer_name}
                    </h4>

                    <p className="text-sm text-white/40">
                      {appointment.phone}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="rounded-lg bg-white/5 px-3 py-2">
                      📅 {formatAppointmentDate(
                        appointment.appointment_date
                      )}
                    </span>

                    <span className="rounded-lg bg-white/5 px-3 py-2">
                      🕐 {appointment.appointment_time.slice(0, 5)}
                    </span>

                    {service && (
                      <span className="rounded-lg bg-white/5 px-3 py-2">
                        ✂️ {service.name}
                      </span>
                    )}

                    {service && (
                      <span className="rounded-lg bg-white/5 px-3 py-2">
                        💰 {service.price} DT
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      appointment.status === "confirmed"
                        ? "bg-green-500/10 text-green-400"
                        : appointment.status === "cancelled"
                        ? "bg-red-500/10 text-red-400"
                        : appointment.status === "completed"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>

                  <div className="flex flex-wrap gap-2">

                    {appointment.status === "pending" && (
                      <button
                        onClick={() =>
                          updateAppointmentStatus(
                            appointment.id,
                            "confirmed"
                          )
                        }
                        className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400 transition hover:bg-green-500/20"
                      >
                        ✓ Confirmer
                      </button>
                    )}

                    {appointment.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateAppointmentStatus(
                            appointment.id,
                            "completed"
                          )
                        }
                        className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-500/20"
                      >
                        ✓ Terminer
                      </button>
                    )}

                    {appointment.status !== "cancelled" &&
                      appointment.status !== "completed" && (
                        <button
                          onClick={() =>
                            updateAppointmentStatus(
                              appointment.id,
                              "cancelled"
                            )
                          }
                          className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
                        >
                          ✕ Annuler
                        </button>
                      )}

                    <a
                      href={`https://wa.me/${appointment.phone.replace(
                        /\D/g,
                        ""
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                    >
                      WhatsApp
                    </a>

                    <a
                      href={`tel:${appointment.phone}`}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                    >
                      Appeler
                    </a>

                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

            {section === "services" && (
  <div>
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-3xl font-bold">
          Services
        </h3>

        <p className="mt-2 text-white/40">
          Gérez les prestations, prix et durées de votre salon.
        </p>
      </div>

      <button
        onClick={() => {
          setEditingServiceId(null);
          setServiceName("");
          setServiceDescription("");
          setServicePrice("");
          setServiceDuration("");
          setServiceImage("");
          setShowServiceForm(true);
        }}
        className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
      >
        + Ajouter un service
      </button>
    </div>

    {showServiceForm && (
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">
              {editingServiceId ? "Modifier le service" : "Nouveau service"}
            </h4>

            <p className="mt-1 text-sm text-white/40">
              Remplissez les informations de la prestation.
            </p>
          </div>

          <button
            onClick={() => setShowServiceForm(false)}
            className="text-white/40 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/60">
              Nom
            </label>

            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Ex: Low Fade"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">
              Prix (DT)
            </label>

            <input
              type="number"
              min="0"
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
              placeholder="20"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">
              Durée (minutes)
            </label>

            <input
              type="number"
              min="1"
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
              placeholder="30"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">
              Image URL
            </label>

            <input
              value={serviceImage}
              onChange={(e) => setServiceImage(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/60">
              Description
            </label>

            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Description du service..."
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={async () => {
              if (!serviceName.trim() || !servicePrice) {
                alert("Veuillez remplir le nom et le prix.");
                return;
              }

              const serviceData = {
                name: serviceName.trim(),
                description: serviceDescription.trim() || null,
                price: Number(servicePrice),
                duration: serviceDuration
                  ? Number(serviceDuration)
                  : null,
                image_url: serviceImage.trim() || null,
              };

              if (editingServiceId) {
                const { error } = await supabase
                  .from("services")
                  .update(serviceData)
                  .eq("id", editingServiceId);

                if (error) {
                  console.error(error);
                  alert("Erreur lors de la modification.");
                  return;
                }
              } else {
                const { error } = await supabase
                  .from("services")
                  .insert({
                    ...serviceData,
                    active: true,
                  });

                if (error) {
                  console.error(error);
                  alert("Erreur lors de l'ajout.");
                  return;
                }
              }

              setShowServiceForm(false);
              setEditingServiceId(null);
              await loadServices();
              await loadDashboardStats();
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            {editingServiceId ? "Enregistrer" : "Ajouter"}
          </button>

          <button
            onClick={() => setShowServiceForm(false)}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Annuler
          </button>
        </div>
      </div>
    )}

    {servicesLoading ? (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <p className="text-white/40">
          Chargement des services...
        </p>
      </div>
    ) : services.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="text-4xl">✂️</div>

        <p className="mt-4 text-white/60">
          Aucun service.
        </p>

        <p className="mt-2 text-sm text-white/30">
          Ajoutez votre première prestation.
        </p>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`overflow-hidden rounded-2xl border bg-white/[0.04] ${
              service.active
                ? "border-white/10"
                : "border-red-500/20 opacity-60"
            }`}
          >
            {service.image_url && (
              <div className="h-40 overflow-hidden bg-white/5">
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">
                    {service.name}
                  </h4>

                  <p className="mt-1 text-sm text-white/40">
                    {service.description || "Aucune description"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                    service.active
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {service.active ? "Actif" : "Masqué"}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <p className="text-lg font-bold">
                    {service.price} DT
                  </p>

                  {service.duration && (
                    <p className="text-xs text-white/40">
                      {service.duration} min
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingServiceId(service.id);
                      setServiceName(service.name);
                      setServiceDescription(
                        service.description ?? ""
                      );
                      setServicePrice(String(service.price));
                      setServiceDuration(
                        service.duration
                          ? String(service.duration)
                          : ""
                      );
                      setServiceImage(
                        service.image_url ?? ""
                      );
                      setShowServiceForm(true);
                    }}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from("services")
                        .update({
                          active: !service.active,
                        })
                        .eq("id", service.id);

                      if (error) {
                        console.error(error);
                        alert("Erreur lors de la modification.");
                        return;
                      }

                      await loadServices();
                      await loadDashboardStats();
                    }}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    {service.active ? "Masquer" : "Activer"}
                  </button>

                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `Supprimer "${service.name}" ?`
                        )
                      ) {
                        return;
                      }

                      const { error } = await supabase
                        .from("services")
                        .delete()
                        .eq("id", service.id);

                      if (error) {
                        console.error(error);
                        alert(
                          "Impossible de supprimer ce service. Il est peut-être utilisé par un rendez-vous."
                        );
                        return;
                      }

                      await loadServices();
                      await loadDashboardStats();
                    }}
                    className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{section === "gallery" && (
  <div>
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-3xl font-bold">
          Galerie
        </h3>

        <p className="mt-2 text-white/40">
          Gérez les photos affichées sur votre site.
        </p>
      </div>

      <label className="cursor-pointer rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:scale-[1.02]">
        {uploadingImage ? "Upload en cours..." : "+ Ajouter une photo"}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploadingImage}
          onChange={async (e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
              alert("L'image ne doit pas dépasser 5 MB.");
              e.target.value = "";
              return;
            }

            setUploadingImage(true);

            try {
              const extension =
                file.name.split(".").pop()?.toLowerCase() || "jpg";

              const fileName = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}.${extension}`;

              const filePath = `gallery/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from("gallery")
                .upload(filePath, file, {
                  cacheControl: "3600",
                  upsert: false,
                });

              if (uploadError) {
                console.error(uploadError);
                alert("Erreur lors de l'upload.");
                return;
              }

              const {
                data: { publicUrl },
              } = supabase.storage
                .from("gallery")
                .getPublicUrl(filePath);

              const { error: databaseError } = await supabase
                .from("gallery")
                .insert({
                  image_url: publicUrl,
                  title: galleryTitle.trim() || null,
                  active: true,
                });

              if (databaseError) {
                console.error(databaseError);

                await supabase.storage
                  .from("gallery")
                  .remove([filePath]);

                alert("Erreur lors de l'enregistrement.");
                return;
              }

              setGalleryTitle("");
              await loadGallery();
            } finally {
              setUploadingImage(false);
              e.target.value = "";
            }
          }}
        />
      </label>
    </div>

    {/* New photo title */}
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <label className="mb-2 block text-sm text-white/60">
        Titre de la prochaine photo
      </label>

      <input
        value={galleryTitle}
        onChange={(e) => setGalleryTitle(e.target.value)}
        placeholder="Ex: Notre salon"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
      />

      <p className="mt-2 text-xs text-white/30">
        Optionnel.
      </p>
    </div>

    {/* Current gallery */}
    {galleryLoading ? (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <p className="text-white/40">
          Chargement de la galerie...
        </p>
      </div>
    ) : galleryImages.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="text-4xl">
          📸
        </div>

        <p className="mt-4 text-white/60">
          Aucune photo.
        </p>

        <p className="mt-2 text-sm text-white/30">
          Ajoutez votre première photo.
        </p>
      </div>
    ) : (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {galleryImages.map((image) => (
          <div
            key={image.id}
            className={`overflow-hidden rounded-2xl border bg-white/[0.04] ${
              image.active
                ? "border-white/10"
                : "border-red-500/20 opacity-60"
            }`}
          >
            {/* Image */}
            <div className="group relative aspect-[4/3] overflow-hidden bg-white/5">
              <img
                src={image.image_url}
                alt={image.title || "Galerie Chelba Coif"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>

            <div className="p-4">

              {/* Title */}
              {editingGalleryId === image.id ? (
                <div className="space-y-3">
                  <input
                    value={editingGalleryTitle}
                    onChange={(e) =>
                      setEditingGalleryTitle(e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Titre de la photo"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from("gallery")
                          .update({
                            title:
                              editingGalleryTitle.trim() || null,
                          })
                          .eq("id", image.id);

                        if (error) {
                          console.error(error);
                          alert("Erreur lors de la modification.");
                          return;
                        }

                        setEditingGalleryId(null);
                        setEditingGalleryTitle("");
                        await loadGallery();
                      }}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
                    >
                      Enregistrer
                    </button>

                    <button
                      onClick={() => {
                        setEditingGalleryId(null);
                        setEditingGalleryTitle("");
                      }}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/20 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold">
                      {image.title || "Sans titre"}
                    </h4>

                    <p className="mt-1 text-xs text-white/30">
                      Photo #{image.id}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      image.active
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {image.active ? "Visible" : "Masquée"}
                  </span>
                </div>
              )}

              {/* Actions */}
              {editingGalleryId !== image.id && (
                <div className="mt-4 grid grid-cols-2 gap-2">

                  {/* Edit title */}
                  <button
                    onClick={() => {
                      setEditingGalleryId(image.id);
                      setEditingGalleryTitle(image.title ?? "");
                    }}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    ✏️ Modifier
                  </button>

                  {/* Hide / show */}
                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from("gallery")
                        .update({
                          active: !image.active,
                        })
                        .eq("id", image.id);

                      if (error) {
                        console.error(error);
                        alert("Erreur lors de la modification.");
                        return;
                      }

                      await loadGallery();
                    }}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                  >
                    {image.active ? "👁️ Masquer" : "👁️ Afficher"}
                  </button>

                  {/* Replace */}
                  <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white/70 transition hover:bg-white/20 hover:text-white">
                    {replacingGalleryId === image.id
                      ? "Upload..."
                      : "🔄 Remplacer"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={replacingGalleryId === image.id}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        if (file.size > 5 * 1024 * 1024) {
                          alert("L'image ne doit pas dépasser 5 MB.");
                          e.target.value = "";
                          return;
                        }

                        setReplacingGalleryId(image.id);

                        try {
                          const extension =
                            file.name.split(".").pop()?.toLowerCase() ||
                            "jpg";

                          const newFileName = `${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2)}.${extension}`;

                          const newFilePath =
                            `gallery/${newFileName}`;

                          const { error: uploadError } =
                            await supabase.storage
                              .from("gallery")
                              .upload(newFilePath, file, {
                                cacheControl: "3600",
                                upsert: false,
                              });

                          if (uploadError) {
                            console.error(uploadError);
                            alert("Erreur lors de l'upload.");
                            return;
                          }

                          const {
                            data: { publicUrl },
                          } = supabase.storage
                            .from("gallery")
                            .getPublicUrl(newFilePath);

                          const { error: updateError } =
                            await supabase
                              .from("gallery")
                              .update({
                                image_url: publicUrl,
                              })
                              .eq("id", image.id);

                          if (updateError) {
                            console.error(updateError);

                            await supabase.storage
                              .from("gallery")
                              .remove([newFilePath]);

                            alert(
                              "Erreur lors du remplacement."
                            );
                            return;
                          }

                          /* Delete old file */
                          const marker =
                            "/storage/v1/object/public/gallery/";

                          const markerIndex =
                            image.image_url.indexOf(marker);

                          if (markerIndex !== -1) {
                            const oldFilePath =
                              image.image_url.substring(
                                markerIndex + marker.length
                              );

                            await supabase.storage
                              .from("gallery")
                              .remove([oldFilePath]);
                          }

                          await loadGallery();
                        } finally {
                          setReplacingGalleryId(null);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>

                  {/* Delete */}
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `Supprimer ${
                            image.title
                              ? `"${image.title}"`
                              : "cette photo"
                          } ?`
                        )
                      ) {
                        return;
                      }

                      const marker =
                        "/storage/v1/object/public/gallery/";

                      const markerIndex =
                        image.image_url.indexOf(marker);

                      if (markerIndex === -1) {
                        alert(
                          "Impossible de trouver le fichier dans Storage."
                        );
                        return;
                      }

                      const filePath =
                        image.image_url.substring(
                          markerIndex + marker.length
                        );

                      const { error: storageError } =
                        await supabase.storage
                          .from("gallery")
                          .remove([filePath]);

                      if (storageError) {
                        console.error(storageError);
                        alert(
                          "Erreur lors de la suppression du fichier."
                        );
                        return;
                      }

                      const { error: databaseError } =
                        await supabase
                          .from("gallery")
                          .delete()
                          .eq("id", image.id);

                      if (databaseError) {
                        console.error(databaseError);
                        alert(
                          "Le fichier a été supprimé mais pas l'enregistrement."
                        );
                        return;
                      }

                      await loadGallery();
                    }}
                    className="col-span-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

            {section === "reviews" && (
              <Placeholder
                title="Avis clients"
                description="Modération des avis envoyés par les clients."
              />
            )}

            {section === "settings" && (
              <Placeholder
                title="Paramètres"
                description="Informations du salon et horaires."
              />
            )}

          </div>
        </section>
      </div>
    </main>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-3xl font-bold">
        {title}
      </h3>

      <p className="mt-2 text-white/40">
        {description}
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <p className="text-white/40">
          Cette section sera connectée à Supabase.
        </p>
      </div>
    </div>
  );
}
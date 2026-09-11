"use client";

import { useEffect, useMemo, useState } from "react";
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

type Review = {
  id: number;
  customer_name: string | null;
  rating: number;
  comment: string;
  active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState<Section>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* =========================
     APPOINTMENTS
  ========================= */

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [appointmentDateFilter, setAppointmentDateFilter] = useState("");

  /* =========================
     SERVICES
  ========================= */

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [servicesCount, setServicesCount] = useState(0);

  const [showServiceForm, setShowServiceForm] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceImage, setServiceImage] = useState("");

  const [editingServiceId, setEditingServiceId] =
    useState<number | null>(null);

  /* =========================
     GALLERY
  ========================= */

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [galleryTitle, setGalleryTitle] = useState("");

  const [editingGalleryId, setEditingGalleryId] =
    useState<number | null>(null);

  const [editingGalleryTitle, setEditingGalleryTitle] = useState("");

  const [replacingGalleryId, setReplacingGalleryId] =
    useState<number | null>(null);

  /* =========================
     REVIEWS
  ========================= */

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(0);

  const [editingReviewId, setEditingReviewId] =
    useState<number | null>(null);

  const [editingReviewName, setEditingReviewName] = useState("");
  const [editingReviewRating, setEditingReviewRating] = useState(5);
  const [editingReviewComment, setEditingReviewComment] = useState("");

  /* =========================
     SETTINGS
  ========================= */

  const [settings, setSettings] = useState({
    id: 1,
    shop_name: "Chelba Coif",
    phone: "",
    whatsapp: "",
    address: "",
    opening_hours: "",
    instagram: "",
    facebook: "",
    maps_url: "",
  });

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  /* =========================
     LOGIN
  ========================= */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  /* =========================
     DERIVED STATS
  ========================= */

  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date === today &&
      appointment.status !== "cancelled"
  );

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending"
  );

  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status === "confirmed"
  );

  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === "completed"
  );

  const cancelledAppointments = appointments.filter(
    (appointment) => appointment.status === "cancelled"
  );

  /* =========================
     FILTERED APPOINTMENTS
  ========================= */

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const search = appointmentSearch.toLowerCase().trim();

      const service = appointment.services?.[0];

      const matchesSearch =
        !search ||
        appointment.customer_name.toLowerCase().includes(search) ||
        appointment.phone.toLowerCase().includes(search) ||
        service?.name.toLowerCase().includes(search);

      const matchesStatus =
        appointmentFilter === "all" ||
        appointment.status === appointmentFilter;

      const matchesDate =
        !appointmentDateFilter ||
        appointment.appointment_date === appointmentDateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [
    appointments,
    appointmentSearch,
    appointmentFilter,
    appointmentDateFilter,
  ]);

  /* =========================
     MENU
  ========================= */

  const menu = [
    {
      id: "dashboard" as Section,
      label: "Dashboard",
      shortLabel: "Accueil",
      icon: "⌂",
    },
    {
      id: "appointments" as Section,
      label: "Rendez-vous",
      shortLabel: "RDV",
      icon: "◷",
    },
    {
      id: "services" as Section,
      label: "Services",
      shortLabel: "Services",
      icon: "✂",
    },
    {
      id: "gallery" as Section,
      label: "Galerie",
      shortLabel: "Galerie",
      icon: "▧",
    },
    {
      id: "reviews" as Section,
      label: "Avis clients",
      shortLabel: "Avis",
      icon: "★",
    },
    {
      id: "settings" as Section,
      label: "Paramètres",
      shortLabel: "Réglages",
      icon: "⚙",
    },
  ];

  /* =========================
     APPOINTMENTS LOAD
  ========================= */

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

  /* =========================
     DASHBOARD STATS
  ========================= */

  async function loadDashboardStats() {
    const { count: servicesCount } = await supabase
      .from("services")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("active", true);

    const { count: reviewsCount } = await supabase
      .from("reviews")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("active", true);

    setServicesCount(servicesCount ?? 0);
    setReviewsCount(reviewsCount ?? 0);
  }

  /* =========================
     SERVICES
  ========================= */

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

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceName("");
    setServiceDescription("");
    setServicePrice("");
    setServiceDuration("");
    setServiceImage("");
  }

  async function saveService() {
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
    resetServiceForm();

    await loadServices();
    await loadDashboardStats();
  }

  /* =========================
     APPOINTMENT ACTIONS
  ========================= */

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

  async function deleteAppointment(id: number) {
    if (
      !confirm(
        "Supprimer définitivement cette réservation ?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting appointment:", error);
      alert("Impossible de supprimer cette réservation.");
      return;
    }

    setAppointments((current) =>
      current.filter(
        (appointment) => appointment.id !== id
      )
    );
  }

  /* =========================
     SETTINGS
  ========================= */

  async function loadSettings() {
    setSettingsLoading(true);

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error loading settings:", error);
      setSettingsLoading(false);
      return;
    }

    if (data) {
      setSettings(data);
    }

    setSettingsLoading(false);
  }

  async function saveSettings() {
    setSettingsSaving(true);

    const { data, error } = await supabase
      .from("settings")
      .update({
        shop_name: settings.shop_name,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        address: settings.address,
        opening_hours: settings.opening_hours,
        instagram: settings.instagram,
        facebook: settings.facebook,
        maps_url: settings.maps_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select();

    if (error) {
      console.error("Error saving settings:", error);
      alert(`Erreur: ${error.message}`);
      setSettingsSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      alert(
        "Aucune ligne n'a été modifiée. Vérifiez que l'id 1 existe dans settings."
      );
      setSettingsSaving(false);
      return;
    }

    setSettings(data[0]);

    alert("Paramètres enregistrés avec succès !");

    setSettingsSaving(false);
  }

  /* =========================
     GALLERY
  ========================= */

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

  async function uploadGalleryImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
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
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

      const filePath = `gallery/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
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
  }

  async function deleteGalleryImage(
    image: GalleryImage
  ) {
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

    const filePath = image.image_url.substring(
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
  }

  async function replaceGalleryImage(
    e: React.ChangeEvent<HTMLInputElement>,
    image: GalleryImage
  ) {
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

        alert("Erreur lors du remplacement.");
        return;
      }

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
  }

  /* =========================
     REVIEWS
  ========================= */

  async function loadReviews() {
    setReviewsLoading(true);

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      setReviewsLoading(false);
      return;
    }

    setReviews((data as Review[]) ?? []);
    setReviewsLoading(false);
  }

  async function updateReviewStatus(
    id: number,
    active: boolean
  ) {
    const { error } = await supabase
      .from("reviews")
      .update({ active })
      .eq("id", id);

    if (error) {
      console.error("Error updating review:", error);
      return;
    }

    setReviews((current) =>
      current.map((review) =>
        review.id === id
          ? { ...review, active }
          : review
      )
    );

    setReviewsCount(
      reviews.filter((review) =>
        review.id === id
          ? active
          : review.active
      ).length
    );
  }

  async function deleteReview(id: number) {
    if (
      !confirm(
        "Supprimer définitivement cet avis ?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting review:", error);
      return;
    }

    setReviews((current) =>
      current.filter((review) => review.id !== id)
    );

    await loadDashboardStats();
  }

  function startEditingReview(review: Review) {
    setEditingReviewId(review.id);
    setEditingReviewName(
      review.customer_name ?? ""
    );
    setEditingReviewRating(review.rating);
    setEditingReviewComment(review.comment);
  }

  function cancelEditingReview() {
    setEditingReviewId(null);
    setEditingReviewName("");
    setEditingReviewRating(5);
    setEditingReviewComment("");
  }

  async function saveReviewEdit(id: number) {
    if (
      editingReviewComment.trim().length < 5
    ) {
      alert(
        "Le commentaire doit contenir au moins 5 caractères."
      );
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .update({
        customer_name:
          editingReviewName.trim() || null,
        rating: editingReviewRating,
        comment:
          editingReviewComment.trim(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating review:", error);
      alert("Erreur lors de la modification.");
      return;
    }

    setReviews((current) =>
      current.map((review) =>
        review.id === id
          ? data
          : review
      )
    );

    cancelEditingReview();
  }

  /* =========================
     AUTH
  ========================= */

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        await Promise.all([
          loadAppointments(),
          loadDashboardStats(),
          loadServices(),
          loadGallery(),
          loadReviews(),
          loadSettings(),
        ]);
      }

      setLoading(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoginLoading(true);
    setError("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(
        "Email ou mot de passe incorrect."
      );
      setLoginLoading(false);
      return;
    }

    setUser(data.user);

    await Promise.all([
      loadAppointments(),
      loadDashboardStats(),
      loadServices(),
      loadGallery(),
      loadReviews(),
      loadSettings(),
    ]);

    setLoginLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  /* =========================
     HELPERS
  ========================= */

  function formatAppointmentDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatLongDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

  function getStatusClass(status: string) {
    switch (status) {
      case "confirmed":
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
      case "cancelled":
        return "border-red-400/20 bg-red-400/10 text-red-400";
      case "completed":
        return "border-blue-400/20 bg-blue-400/10 text-blue-400";
      default:
        return "border-amber-400/20 bg-amber-400/10 text-amber-400";
    }
  }

  function getInitials(name: string) {
    const parts = name
      .trim()
      .split(" ")
      .filter(Boolean);

    if (parts.length === 0) return "C";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] text-white">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-black">
            C
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/50 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/20 [animation-delay:300ms]" />
          </div>

          <p className="mt-4 text-sm text-white/40">
            Chargement de l'administration...
          </p>
        </div>
      </main>
    );
  }

  /* =========================
     LOGIN
  ========================= */

  if (!user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070707] px-5 text-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-black shadow-2xl">
              C
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight">
              Chelba Coif
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Administration
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-7">
              <h2 className="text-xl font-bold">
                Bienvenue
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Connectez-vous pour gérer votre salon.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/50"
                  placeholder="admin@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Mot de passe
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/50"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:scale-[1.01] hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginLoading
                  ? "Connexion..."
                  : "Se connecter"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-white/20">
            Chelba Coif • Espace privé
          </p>
        </div>
      </main>
    );
  }

  /* =========================
     MAIN ADMIN
  ========================= */

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="flex min-h-screen overflow-x-hidden">

        {/* =========================
            DESKTOP SIDEBAR
        ========================= */}

        <aside className="hidden w-[270px] shrink-0 border-r border-white/[0.08] bg-[#090909] lg:flex lg:flex-col">
          <div className="border-b border-white/[0.08] p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white font-black text-black shadow-lg">
                C
              </div>

              <div className="min-w-0">
                <h1 className="truncate font-bold">
                  Chelba Coif
                </h1>

                <p className="mt-0.5 text-xs text-white/30">
                  Administration
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
              Menu principal
            </p>

            <nav className="space-y-1">
              {menu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${
                    section === item.id
                      ? "bg-white text-black shadow-lg"
                      : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                      section === item.id
                        ? "bg-black/10"
                        : "bg-white/[0.04] group-hover:bg-white/[0.08]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="font-medium">
                    {item.label}
                  </span>

                  {item.id ===
                    "appointments" &&
                    pendingAppointments.length >
                      0 && (
                      <span
                        className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                          section ===
                          item.id
                            ? "bg-black text-white"
                            : "bg-amber-400 text-black"
                        }`}
                      >
                        {
                          pendingAppointments.length
                        }
                      </span>
                    )}
                </button>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/[0.08] p-4">
            <div className="mb-3 rounded-xl bg-white/[0.03] p-3">
              <p className="truncate text-xs text-white/30">
                Connecté en tant que
              </p>

              <p className="mt-1 truncate text-sm font-medium text-white/70">
                {user.email}
              </p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <span>↪</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* =========================
            CONTENT
        ========================= */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070707]/90 backdrop-blur-xl">
            <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-7 lg:px-10">
              <div>
                <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 sm:block">
                  Chelba Coif
                </p>

                <h2 className="text-base font-bold sm:mt-1 sm:text-xl">
                  {
                    menu.find(
                      (item) =>
                        item.id === section
                    )?.label
                  }
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-400 sm:flex sm:items-center sm:gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  En ligne
                </div>

                <button
                  onClick={logout}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white lg:hidden"
                >
                  Sortir
                </button>
              </div>
            </div>

            {/* MOBILE NAV */}

            <div className="relative border-t border-white/[0.06] px-4 py-2.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white/80 transition active:scale-[0.99]"
                aria-expanded={mobileMenuOpen}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-lg">☰</span>
                  <span>Navigation</span>
                </span>
                <span className="text-white/40">{mobileMenuOpen ? "⌃" : "⌄"}</span>
              </button>

              {mobileMenuOpen && (
                <div className="absolute left-4 right-4 top-[calc(100%-1px)] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#111]/98 p-1.5 shadow-2xl backdrop-blur-xl">
                  {menu.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition ${
                        section === item.id
                          ? "bg-white text-black"
                          : "text-white/55 active:bg-white/10 active:text-white"
                      }`}
                    >
                      <span className="w-6 text-center">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.id === "appointments" && pendingAppointments.length > 0 && (
                        <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${section === item.id ? "bg-black text-white" : "bg-amber-400 text-black"}`}>
                          {pendingAppointments.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className="p-4 pb-8 sm:p-7 sm:pb-10 lg:p-10">

            {/* =========================
                DASHBOARD
            ========================= */}

            {section === "dashboard" && (
              <div className="mx-auto max-w-[1500px]">

                <div className="mb-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-sm text-white/30">
                        Vue générale
                      </p>

                      <h3 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">
                        Bonjour 👋
                      </h3>

                      <p className="mt-2 max-w-xl text-sm text-white/40">
                        Gérez facilement les rendez-vous,
                        services, avis et contenu de votre salon.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        await Promise.all([
                          loadAppointments(),
                          loadDashboardStats(),
                        ]);
                      }}
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white sm:w-fit"
                    >
                      ↻ Actualiser
                    </button>
                  </div>
                </div>

                {/* STAT CARDS */}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <DashboardCard
                    label="Aujourd'hui"
                    value={
                      todayAppointments.length
                    }
                    description="rendez-vous"
                    icon="◷"
                    onClick={() =>
                      setSection(
                        "appointments"
                      )
                    }
                  />

                  <DashboardCard
                    label="En attente"
                    value={
                      pendingAppointments.length
                    }
                    description="à confirmer"
                    icon="!"
                    accent="amber"
                    onClick={() => {
                      setAppointmentFilter(
                        "pending"
                      );
                      setSection(
                        "appointments"
                      );
                    }}
                  />

                  <DashboardCard
                    label="Services actifs"
                    value={servicesCount}
                    description="prestations"
                    icon="✂"
                    onClick={() =>
                      setSection("services")
                    }
                  />

                  <DashboardCard
                    label="Avis publiés"
                    value={reviewsCount}
                    description="avis clients"
                    icon="★"
                    onClick={() =>
                      setSection("reviews")
                    }
                  />

                </div>

                {/* SECONDARY STATS */}

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <MiniStat
                    label="Confirmés"
                    value={
                      confirmedAppointments.length
                    }
                    icon="✓"
                  />

                  <MiniStat
                    label="Terminés"
                    value={
                      completedAppointments.length
                    }
                    icon="✓"
                  />

                  <MiniStat
                    label="Annulés"
                    value={
                      cancelledAppointments.length
                    }
                    icon="×"
                  />
                </div>

                {/* RECENT APPOINTMENTS */}

                <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                  <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <h3 className="font-bold">
                        Rendez-vous récents
                      </h3>

                      <p className="mt-1 text-xs text-white/30">
                        Les dernières réservations.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setSection(
                          "appointments"
                        )
                      }
                      className="w-fit rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      Voir tous les rendez-vous →
                    </button>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {appointments.length ===
                    0 ? (
                      <div className="p-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-xl text-white/20">
                          ◷
                        </div>

                        <p className="mt-4 text-sm text-white/40">
                          Aucun rendez-vous.
                        </p>
                      </div>
                    ) : (
                      appointments
                        .slice(0, 6)
                        .map(
                          (
                            appointment
                          ) => {
                            const service =
                              appointment
                                .services?.[0];

                            return (
                              <AppointmentRow
                                key={
                                  appointment.id
                                }
                                appointment={
                                  appointment
                                }
                                service={
                                  service
                                }
                                onClick={() => {
                                  setSection(
                                    "appointments"
                                  );
                                }}
                              />
                            );
                          }
                        )
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* =========================
                APPOINTMENTS
            ========================= */}

            {section === "appointments" && (
              <div className="mx-auto max-w-[1500px]">

                <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-sm text-white/30">
                      Planning
                    </p>

                    <h3 className="mt-1 text-3xl font-black tracking-tight">
                      Rendez-vous
                    </h3>

                    <p className="mt-2 text-sm text-white/40">
                      Gérez toutes les réservations de vos clients.
                    </p>
                  </div>

                  <button
                    onClick={loadAppointments}
                    disabled={
                      appointmentsLoading
                    }
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50 sm:w-fit"
                  >
                    {appointmentsLoading
                      ? "Actualisation..."
                      : "↻ Actualiser"}
                  </button>
                </div>

                {/* APPOINTMENT STATS */}

                <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FilterStat
                    label="Tous"
                    value={
                      appointments.length
                    }
                    active={
                      appointmentFilter ===
                      "all"
                    }
                    onClick={() =>
                      setAppointmentFilter(
                        "all"
                      )
                    }
                  />

                  <FilterStat
                    label="En attente"
                    value={
                      pendingAppointments.length
                    }
                    active={
                      appointmentFilter ===
                      "pending"
                    }
                    onClick={() =>
                      setAppointmentFilter(
                        "pending"
                      )
                    }
                  />

                  <FilterStat
                    label="Confirmés"
                    value={
                      confirmedAppointments.length
                    }
                    active={
                      appointmentFilter ===
                      "confirmed"
                    }
                    onClick={() =>
                      setAppointmentFilter(
                        "confirmed"
                      )
                    }
                  />

                  <FilterStat
                    label="Terminés"
                    value={
                      completedAppointments.length
                    }
                    active={
                      appointmentFilter ===
                      "completed"
                    }
                    onClick={() =>
                      setAppointmentFilter(
                        "completed"
                      )
                    }
                  />
                </div>

                {/* FILTERS */}

                <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25">
                        ⌕
                      </span>

                      <input
                        value={
                          appointmentSearch
                        }
                        onChange={(e) =>
                          setAppointmentSearch(
                            e.target.value
                          )
                        }
                        placeholder="Rechercher un client, téléphone ou service..."
                        className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-white/25"
                      />
                    </div>

                    <select
                      value={
                        appointmentFilter
                      }
                      onChange={(e) =>
                        setAppointmentFilter(
                          e.target.value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/70 outline-none"
                    >
                      <option value="all">
                        Tous les statuts
                      </option>
                      <option value="pending">
                        En attente
                      </option>
                      <option value="confirmed">
                        Confirmés
                      </option>
                      <option value="completed">
                        Terminés
                      </option>
                      <option value="cancelled">
                        Annulés
                      </option>
                    </select>

                    <input
                      type="date"
                      value={
                        appointmentDateFilter
                      }
                      onChange={(e) =>
                        setAppointmentDateFilter(
                          e.target.value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/70 outline-none"
                    />

                    <button
                      onClick={() => {
                        setAppointmentSearch(
                          ""
                        );
                        setAppointmentFilter(
                          "all"
                        );
                        setAppointmentDateFilter(
                          ""
                        );
                      }}
                      className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/40 transition hover:bg-white/10 hover:text-white"
                    >
                      Réinitialiser
                    </button>

                  </div>
                </div>

                {/* APPOINTMENTS */}

                {appointmentsLoading ? (
                  <LoadingBox text="Chargement des rendez-vous..." />
                ) : filteredAppointments.length ===
                  0 ? (
                  <EmptyState
                    icon="◷"
                    title="Aucun rendez-vous"
                    description={
                      appointments.length ===
                      0
                        ? "Les réservations faites depuis votre site apparaîtront ici."
                        : "Aucun rendez-vous ne correspond à vos filtres."
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map(
                      (appointment) => {
                        const service =
                          appointment
                            .services?.[0];

                        return (
                          <AppointmentCard
                            key={
                              appointment.id
                            }
                            appointment={
                              appointment
                            }
                            service={service}
                            onConfirm={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "confirmed"
                              )
                            }
                            onComplete={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "completed"
                              )
                            }
                            onCancel={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "cancelled"
                              )
                            }
                            onDelete={() =>
                              deleteAppointment(
                                appointment.id
                              )
                            }
                          />
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================
                SERVICES
            ========================= */}

            {section === "services" && (
              <div className="mx-auto max-w-[1500px]">

                <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-white/30">
                      Catalogue
                    </p>

                    <h3 className="mt-1 text-3xl font-black tracking-tight">
                      Services
                    </h3>

                    <p className="mt-2 text-sm text-white/40">
                      Gérez les prestations, prix et durées de votre salon.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      resetServiceForm();
                      setShowServiceForm(
                        true
                      );
                    }}
                    className="w-fit rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg transition hover:scale-[1.01] hover:bg-white/90"
                  >
                    + Ajouter un service
                  </button>
                </div>

                {/* SERVICE FORM */}

                {showServiceForm && (
                  <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    <div className="flex items-center justify-between border-b border-white/[0.07] p-5 sm:p-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/30">
                          {editingServiceId
                            ? "Modification"
                            : "Nouveau"}
                        </p>

                        <h4 className="mt-1 text-xl font-bold">
                          {editingServiceId
                            ? "Modifier le service"
                            : "Ajouter un service"}
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          setShowServiceForm(
                            false
                          );
                          resetServiceForm();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/40 transition hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="grid gap-5 md:grid-cols-2">

                        <FormField
                          label="Nom"
                          required
                        >
                          <input
                            value={
                              serviceName
                            }
                            onChange={(e) =>
                              setServiceName(
                                e.target.value
                              )
                            }
                            placeholder="Ex: Low Fade"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField
                          label="Prix"
                          required
                        >
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={
                                servicePrice
                              }
                              onChange={(e) =>
                                setServicePrice(
                                  e.target.value
                                )
                              }
                              placeholder="20"
                              className={`${inputClass} pr-12`}
                            />

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
                              DT
                            </span>
                          </div>
                        </FormField>

                        <FormField label="Durée">
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={
                                serviceDuration
                              }
                              onChange={(e) =>
                                setServiceDuration(
                                  e.target.value
                                )
                              }
                              placeholder="30"
                              className={`${inputClass} pr-16`}
                            />

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
                              min
                            </span>
                          </div>
                        </FormField>

                        <FormField label="Image URL">
                          <input
                            value={
                              serviceImage
                            }
                            onChange={(e) =>
                              setServiceImage(
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </FormField>

                        <div className="md:col-span-2">
                          <FormField label="Description">
                            <textarea
                              value={
                                serviceDescription
                              }
                              onChange={(e) =>
                                setServiceDescription(
                                  e.target.value
                                )
                              }
                              placeholder="Description du service..."
                              rows={4}
                              className={`${inputClass} resize-none`}
                            />
                          </FormField>
                        </div>

                      </div>

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.07] pt-6">
                        <button
                          onClick={
                            saveService
                          }
                          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90"
                        >
                          {editingServiceId
                            ? "Enregistrer"
                            : "Ajouter le service"}
                        </button>

                        <button
                          onClick={() => {
                            setShowServiceForm(
                              false
                            );
                            resetServiceForm();
                          }}
                          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {servicesLoading ? (
                  <LoadingBox text="Chargement des services..." />
                ) : services.length ===
                  0 ? (
                  <EmptyState
                    icon="✂"
                    title="Aucun service"
                    description="Ajoutez votre première prestation."
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {services.map(
                      (service) => (
                        <ServiceCard
                          key={
                            service.id
                          }
                          service={
                            service
                          }
                          onEdit={() => {
                            setEditingServiceId(
                              service.id
                            );
                            setServiceName(
                              service.name
                            );
                            setServiceDescription(
                              service.description ??
                                ""
                            );
                            setServicePrice(
                              String(
                                service.price
                              )
                            );
                            setServiceDuration(
                              service.duration
                                ? String(
                                    service.duration
                                  )
                                : ""
                            );
                            setServiceImage(
                              service.image_url ??
                                ""
                            );
                            setShowServiceForm(
                              true
                            );
                          }}
                          onToggle={async () => {
                            const {
                              error,
                            } =
                              await supabase
                                .from(
                                  "services"
                                )
                                .update({
                                  active:
                                    !service.active,
                                })
                                .eq(
                                  "id",
                                  service.id
                                );

                            if (error) {
                              console.error(
                                error
                              );
                              alert(
                                "Erreur lors de la modification."
                              );
                              return;
                            }

                            await loadServices();
                            await loadDashboardStats();
                          }}
                          onDelete={async () => {
                            if (
                              !confirm(
                                `Supprimer "${service.name}" ?`
                              )
                            ) {
                              return;
                            }

                            const {
                              error,
                            } =
                              await supabase
                                .from(
                                  "services"
                                )
                                .delete()
                                .eq(
                                  "id",
                                  service.id
                                );

                            if (error) {
                              console.error(
                                error
                              );
                              alert(
                                "Impossible de supprimer ce service. Il est peut-être utilisé par un rendez-vous."
                              );
                              return;
                            }

                            await loadServices();
                            await loadDashboardStats();
                          }}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================
                GALLERY
            ========================= */}

            {section === "gallery" && (
              <div className="mx-auto max-w-[1500px]">

                <div className="mb-8">
                  <p className="text-sm text-white/30">
                    Contenu
                  </p>

                  <h3 className="mt-1 text-3xl font-black tracking-tight">
                    Galerie
                  </h3>

                  <p className="mt-2 text-sm text-white/40">
                    Gérez les photos affichées sur votre site.
                  </p>
                </div>

                {/* UPLOAD */}

                <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/60">
                        ▧
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold">
                          Ajouter une photo
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          JPG, PNG ou WEBP • maximum 5 MB.
                        </p>

                        <div className="mt-4">
                          <input
                            value={
                              galleryTitle
                            }
                            onChange={(e) =>
                              setGalleryTitle(
                                e.target.value
                              )
                            }
                            placeholder="Titre de la photo (optionnel)"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white px-7 py-5 text-sm font-bold text-black transition hover:bg-white/90 lg:min-w-[190px]">
                    {uploadingImage
                      ? "Upload..."
                      : "+ Choisir une photo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={
                        uploadingImage
                      }
                      onChange={
                        uploadGalleryImage
                      }
                    />
                  </label>
                </div>

                {/* GALLERY */}

                {galleryLoading ? (
                  <LoadingBox text="Chargement de la galerie..." />
                ) : galleryImages.length ===
                  0 ? (
                  <EmptyState
                    icon="▧"
                    title="Galerie vide"
                    description="Ajoutez votre première photo."
                  />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {galleryImages.map(
                      (image) => (
                        <GalleryCard
                          key={
                            image.id
                          }
                          image={
                            image
                          }
                          editing={
                            editingGalleryId ===
                            image.id
                          }
                          editingTitle={
                            editingGalleryTitle
                          }
                          onEditingTitleChange={
                            setEditingGalleryTitle
                          }
                          onStartEdit={() => {
                            setEditingGalleryId(
                              image.id
                            );
                            setEditingGalleryTitle(
                              image.title ??
                                ""
                            );
                          }}
                          onCancelEdit={() => {
                            setEditingGalleryId(
                              null
                            );
                            setEditingGalleryTitle(
                              ""
                            );
                          }}
                          onSaveEdit={async () => {
                            const {
                              error,
                            } =
                              await supabase
                                .from(
                                  "gallery"
                                )
                                .update({
                                  title:
                                    editingGalleryTitle.trim() ||
                                    null,
                                })
                                .eq(
                                  "id",
                                  image.id
                                );

                            if (error) {
                              console.error(
                                error
                              );
                              alert(
                                "Erreur lors de la modification."
                              );
                              return;
                            }

                            setEditingGalleryId(
                              null
                            );
                            setEditingGalleryTitle(
                              ""
                            );

                            await loadGallery();
                          }}
                          onToggle={async () => {
                            const {
                              error,
                            } =
                              await supabase
                                .from(
                                  "gallery"
                                )
                                .update({
                                  active:
                                    !image.active,
                                })
                                .eq(
                                  "id",
                                  image.id
                                );

                            if (error) {
                              console.error(
                                error
                              );
                              alert(
                                "Erreur lors de la modification."
                              );
                              return;
                            }

                            await loadGallery();
                          }}
                          replacing={
                            replacingGalleryId ===
                            image.id
                          }
                          onReplace={(e) =>
                            replaceGalleryImage(
                              e,
                              image
                            )
                          }
                          onDelete={() =>
                            deleteGalleryImage(
                              image
                            )
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================
                REVIEWS
            ========================= */}

            {section === "reviews" && (
              <div className="mx-auto max-w-[1200px]">

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-white/30">
                      Réputation
                    </p>

                    <h3 className="mt-1 text-3xl font-black tracking-tight">
                      Avis clients
                    </h3>

                    <p className="mt-2 text-sm text-white/40">
                      Gérez les avis reçus et choisissez lesquels apparaissent sur le site.
                    </p>
                  </div>

                  <button
                    onClick={loadReviews}
                    className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    ↻ Actualiser
                  </button>
                </div>

                {/* REVIEW SUMMARY */}

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <MiniStat
                    label="Total"
                    value={reviews.length}
                    icon="★"
                  />

                  <MiniStat
                    label="Publiés"
                    value={
                      reviews.filter(
                        (review) =>
                          review.active
                      ).length
                    }
                    icon="✓"
                  />

                  <MiniStat
                    label="En attente"
                    value={
                      reviews.filter(
                        (review) =>
                          !review.active
                      ).length
                    }
                    icon="!"
                  />
                </div>

                {reviewsLoading ? (
                  <LoadingBox text="Chargement des avis..." />
                ) : reviews.length ===
                  0 ? (
                  <EmptyState
                    icon="★"
                    title="Aucun avis"
                    description="Les avis de vos clients apparaîtront ici."
                  />
                ) : (
                  <div className="space-y-4">
                    {reviews.map(
                      (review) => (
                        <div
                          key={
                            review.id
                          }
                          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]"
                        >
                          {editingReviewId ===
                          review.id ? (
                            <div className="p-5 sm:p-6">
                              <div className="mb-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/30">
                                  Modifier
                                </p>

                                <h4 className="mt-1 text-lg font-bold">
                                  Modifier l'avis
                                </h4>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <FormField label="Nom">
                                  <input
                                    value={
                                      editingReviewName
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      setEditingReviewName(
                                        e.target
                                          .value
                                      )
                                    }
                                    placeholder="Nom du client"
                                    className={
                                      inputClass
                                    }
                                  />
                                </FormField>

                                <FormField label="Note">
                                  <select
                                    value={
                                      editingReviewRating
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      setEditingReviewRating(
                                        Number(
                                          e
                                            .target
                                            .value
                                        )
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  >
                                    <option value={5}>
                                      ★★★★★ — 5/5
                                    </option>
                                    <option value={4}>
                                      ★★★★☆ — 4/5
                                    </option>
                                    <option value={3}>
                                      ★★★☆☆ — 3/5
                                    </option>
                                    <option value={2}>
                                      ★★☆☆☆ — 2/5
                                    </option>
                                    <option value={1}>
                                      ★☆☆☆☆ — 1/5
                                    </option>
                                  </select>
                                </FormField>

                                <div className="md:col-span-2">
                                  <FormField label="Commentaire">
                                    <textarea
                                      value={
                                        editingReviewComment
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditingReviewComment(
                                          e
                                            .target
                                            .value
                                        )
                                      }
                                      rows={
                                        4
                                      }
                                      className={`${inputClass} resize-none`}
                                    />
                                  </FormField>
                                </div>
                              </div>

                              <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-5">
                                <button
                                  onClick={() =>
                                    saveReviewEdit(
                                      review.id
                                    )
                                  }
                                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black"
                                >
                                  Enregistrer
                                </button>

                                <button
                                  onClick={
                                    cancelEditingReview
                                  }
                                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 sm:p-6">
                              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                                <div className="flex gap-4">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
                                    {getInitials(
                                      review.customer_name ||
                                        "Client"
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h4 className="font-bold">
                                        {review.customer_name ||
                                          "Client"}
                                      </h4>

                                      <span
                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                          review.active
                                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                                            : "border-amber-400/20 bg-amber-400/10 text-amber-400"
                                        }`}
                                      >
                                        {review.active
                                          ? "Publié"
                                          : "En attente"}
                                      </span>
                                    </div>

                                    <div className="mt-1 text-sm tracking-[0.15em] text-white">
                                      {"★".repeat(
                                        review.rating
                                      )}
                                      <span className="text-white/15">
                                        {"★".repeat(
                                          5 -
                                            review.rating
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55">
                                      {
                                        review.comment
                                      }
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                                  {!review.active ? (
                                    <button
                                      onClick={() =>
                                        updateReviewStatus(
                                          review.id,
                                          true
                                        )
                                      }
                                      className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-white/90"
                                    >
                                      ✓ Approuver
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        updateReviewStatus(
                                          review.id,
                                          false
                                        )
                                      }
                                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                                    >
                                      Masquer
                                    </button>
                                  )}

                                  <button
                                    onClick={() =>
                                      startEditingReview(
                                        review
                                      )
                                    }
                                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                                  >
                                    Modifier
                                  </button>

                                  <button
                                    onClick={() =>
                                      deleteReview(
                                        review.id
                                      )
                                    }
                                    className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
                                  >
                                    Supprimer
                                  </button>
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================
                SETTINGS
            ========================= */}

            {section === "settings" && (
              <div className="mx-auto max-w-[1100px]">

                <div className="mb-8">
                  <p className="text-sm text-white/30">
                    Configuration
                  </p>

                  <h3 className="mt-1 text-3xl font-black tracking-tight">
                    Paramètres
                  </h3>

                  <p className="mt-2 text-sm text-white/40">
                    Gérez les informations visibles sur votre site.
                  </p>
                </div>

                {settingsLoading ? (
                  <LoadingBox text="Chargement des paramètres..." />
                ) : (
                  <div className="space-y-5">

                    {/* SHOP INFO */}

                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                      <div className="border-b border-white/[0.07] p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                            ◉
                          </div>

                          <div>
                            <h4 className="font-bold">
                              Informations du salon
                            </h4>

                            <p className="mt-0.5 text-xs text-white/30">
                              Informations principales.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

                        <FormField label="Nom du salon">
                          <input
                            type="text"
                            value={
                              settings.shop_name
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                shop_name:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="Chelba Coif"
                          />
                        </FormField>

                        <FormField label="Téléphone">
                          <input
                            type="text"
                            value={
                              settings.phone
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                phone:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="+216 XX XXX XXX"
                          />
                        </FormField>

                        <FormField label="WhatsApp">
                          <input
                            type="text"
                            value={
                              settings.whatsapp
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                whatsapp:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="+216 XX XXX XXX"
                          />
                        </FormField>

                        <FormField label="Horaires">
                          <input
                            type="text"
                            value={
                              settings.opening_hours
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                opening_hours:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="09:00 - 19:00"
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Adresse">
                            <input
                              type="text"
                              value={
                                settings.address
                              }
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  address:
                                    e.target
                                      .value,
                                })
                              }
                              className={
                                inputClass
                              }
                              placeholder="Adresse du salon"
                            />
                          </FormField>
                        </div>

                      </div>
                    </div>

                    {/* SOCIAL */}

                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                      <div className="border-b border-white/[0.07] p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                            @
                          </div>

                          <div>
                            <h4 className="font-bold">
                              Réseaux & localisation
                            </h4>

                            <p className="mt-0.5 text-xs text-white/30">
                              Liens utilisés sur votre site.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

                        <FormField label="Instagram">
                          <input
                            type="url"
                            value={
                              settings.instagram
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                instagram:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="https://instagram.com/..."
                          />
                        </FormField>

                        <FormField label="Facebook">
                          <input
                            type="url"
                            value={
                              settings.facebook
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                facebook:
                                  e.target
                                    .value,
                              })
                            }
                            className={
                              inputClass
                            }
                            placeholder="https://facebook.com/..."
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Google Maps">
                            <input
                              type="url"
                              value={
                                settings.maps_url
                              }
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  maps_url:
                                    e.target
                                      .value,
                                })
                              }
                              className={
                                inputClass
                              }
                              placeholder="https://maps.app.goo.gl/..."
                            />
                          </FormField>
                        </div>

                      </div>
                    </div>

                    {/* SAVE */}

                    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      <div>
                        <p className="font-semibold">
                          Enregistrer les modifications
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          Les informations seront mises à jour sur le site public.
                        </p>
                      </div>

                      <button
                        onClick={
                          saveSettings
                        }
                        disabled={
                          settingsSaving
                        }
                        className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {settingsSaving
                          ? "Enregistrement..."
                          : "Enregistrer"}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   SHARED COMPONENTS
========================================================= */

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-black/30";

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/35">
        {label}
        {required && (
          <span className="ml-1 text-white/60">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function DashboardCard({
  label,
  value,
  description,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
  accent?: "amber";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left"
    >
      <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.04]">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm ${
              accent === "amber"
                ? "bg-amber-400/10 text-amber-400"
                : "bg-white/[0.06] text-white/60"
            }`}
          >
            {icon}
          </div>

          <span className="text-xs text-white/15 transition group-hover:text-white/40">
            →
          </span>
        </div>

        <p className="mt-5 text-xs font-medium text-white/35">
          {label}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-3xl font-black">
            {value}
          </p>

          <p className="text-xs text-white/25">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-[11px] text-white/30">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-bold">
          {value}
        </p>
      </div>

      <span className="text-sm text-white/20">
        {icon}
      </span>
    </div>
  );
}

function FilterStat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-white/20 bg-white/[0.08]"
          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <p className="text-xs text-white/35">
        {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {value}
      </p>
    </button>
  );
}

function AppointmentRow({
  appointment,
  service,
  onClick,
}: {
  appointment: Appointment;
  service:
    | NonNullable<Appointment["services"]>[number]
    | undefined;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-black">
          {getInitialsStatic(
            appointment.customer_name
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {appointment.customer_name}
          </p>

          <p className="mt-0.5 truncate text-xs text-white/30">
            {service?.name ??
              "Service"}{" "}
            •{" "}
            {appointment.phone}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium">
            {formatDateStatic(
              appointment.appointment_date
            )}
          </p>

          <p className="mt-0.5 text-xs text-white/30">
            {appointment.appointment_time.slice(
              0,
              5
            )}
          </p>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClassStatic(
            appointment.status
          )}`}
        >
          {getStatusLabelStatic(
            appointment.status
          )}
        </span>
      </div>
    </button>
  );
}

function AppointmentCard({
  appointment,
  service,
  onConfirm,
  onComplete,
  onCancel,
  onDelete,
}: {
  appointment: Appointment;
  service:
    | NonNullable<Appointment["services"]>[number]
    | undefined;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const whatsappNumber =
    appointment.phone.replace(/\D/g, "");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:border-white/[0.12]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              {getInitialsStatic(
                appointment.customer_name
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-bold">
                  {
                    appointment.customer_name
                  }
                </h4>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClassStatic(
                    appointment.status
                  )}`}
                >
                  {getStatusLabelStatic(
                    appointment.status
                  )}
                </span>
              </div>

              <a
                href={`tel:${appointment.phone}`}
                className="mt-1 block w-fit text-xs text-white/30 transition hover:text-white"
              >
                {appointment.phone}
              </a>

              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill
                  icon="▣"
                  text={formatDateStaticLong(
                    appointment.appointment_date
                  )}
                />

                <InfoPill
                  icon="◷"
                  text={appointment.appointment_time.slice(
                    0,
                    5
                  )}
                />

                {service && (
                  <InfoPill
                    icon="✂"
                    text={service.name}
                  />
                )}

                {service && (
                  <InfoPill
                    icon="DT"
                    text={`${service.price} DT`}
                  />
                )}

                {service?.duration && (
                  <InfoPill
                    icon="⌛"
                    text={`${service.duration} min`}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[500px] xl:justify-end">

            {appointment.status ===
              "pending" && (
              <button
                onClick={onConfirm}
                className="min-h-11 flex-1 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-400/20 sm:flex-none"
              >
                ✓ Confirmer
              </button>
            )}

            {appointment.status ===
              "confirmed" && (
              <button
                onClick={onComplete}
                className="min-h-11 flex-1 rounded-lg bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-400 transition hover:bg-blue-400/20 sm:flex-none"
              >
                ✓ Terminer
              </button>
            )}

            {appointment.status !==
              "cancelled" &&
              appointment.status !==
                "completed" && (
                <button
                  onClick={onCancel}
                  className="min-h-11 flex-1 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-400/20 sm:flex-none"
                >
                  × Annuler
                </button>
              )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-11 flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white sm:flex-none"
              >
                WhatsApp
              </a>
            )}

            <a
              href={`tel:${appointment.phone}`}
              className="min-h-11 flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white sm:flex-none"
            >
              Appeler
            </a>

            <button
              onClick={onDelete}
              className="min-h-11 flex-1 rounded-lg border border-red-500/10 px-3 py-2 text-xs text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400 sm:flex-none"
            >
              Supprimer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-white/45">
      <span className="text-white/25">
        {icon}
      </span>

      {text}
    </span>
  );
}

function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white/[0.025] transition hover:border-white/[0.15] ${
        service.active
          ? "border-white/[0.08]"
          : "border-red-500/20 opacity-65"
      }`}
    >
      {service.image_url ? (
        <div className="relative h-44 overflow-hidden bg-white/[0.03]">
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />

          <div className="absolute left-3 top-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${
                service.active
                  ? "border-emerald-400/20 bg-black/60 text-emerald-400"
                  : "border-red-400/20 bg-black/60 text-red-400"
              }`}
            >
              {service.active
                ? "Actif"
                : "Masqué"}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center bg-white/[0.02]">
          <span className="text-3xl text-white/10">
            ✂
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold">
              {service.name}
            </h4>

            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/30">
              {service.description ||
                "Aucune description"}
            </p>
          </div>

          {!service.image_url && (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                service.active
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                  : "border-red-400/20 bg-red-400/10 text-red-400"
              }`}
            >
              {service.active
                ? "Actif"
                : "Masqué"}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-white/[0.07] pt-4">
          <div>
            <p className="text-xl font-black">
              {service.price}{" "}
              <span className="text-xs font-medium text-white/30">
                DT
              </span>
            </p>

            {service.duration && (
              <p className="mt-0.5 text-[11px] text-white/25">
                {service.duration} minutes
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              Modifier
            </button>

            <button
              onClick={onToggle}
              className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              {service.active
                ? "Masquer"
                : "Activer"}
            </button>

            <button
              onClick={onDelete}
              className="rounded-lg border border-red-500/15 px-3 py-2 text-[11px] text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryCard({
  image,
  editing,
  editingTitle,
  onEditingTitleChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggle,
  replacing,
  onReplace,
  onDelete,
}: {
  image: GalleryImage;
  editing: boolean;
  editingTitle: string;
  onEditingTitleChange: (
    value: string
  ) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggle: () => void;
  replacing: boolean;
  onReplace: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white/[0.025] ${
        image.active
          ? "border-white/[0.08]"
          : "border-red-500/20 opacity-65"
      }`}
    >
      <div className="group relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
        <img
          src={image.image_url}
          alt={
            image.title ||
            "Galerie Chelba Coif"
          }
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${
              image.active
                ? "border-emerald-400/20 bg-black/60 text-emerald-400"
                : "border-red-400/20 bg-black/60 text-red-400"
            }`}
          >
            {image.active
              ? "Visible"
              : "Masquée"}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/40 backdrop-blur-md">
          #{image.id}
        </div>
      </div>

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <input
              value={editingTitle}
              onChange={(e) =>
                onEditingTitleChange(
                  e.target.value
                )
              }
              placeholder="Titre de la photo"
              className={inputClass}
            />

            <div className="flex gap-2">
              <button
                onClick={onSaveEdit}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
              >
                Enregistrer
              </button>

              <button
                onClick={onCancelEdit}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold">
                  {image.title ||
                    "Sans titre"}
                </h4>

                <p className="mt-1 text-[10px] text-white/25">
                  Photo #{image.id}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onStartEdit}
                className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                ✎ Modifier
              </button>

              <button
                onClick={onToggle}
                className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                {image.active
                  ? "Masquer"
                  : "Afficher"}
              </button>

              <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-center text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white">
                {replacing
                  ? "Upload..."
                  : "↻ Remplacer"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={replacing}
                  onChange={onReplace}
                />
              </label>

              <button
                onClick={onDelete}
                className="rounded-lg border border-red-500/15 px-3 py-2 text-[11px] text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
              >
                Supprimer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-12 text-center">
      <div className="mx-auto flex w-fit items-center gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/70" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/40 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/20 [animation-delay:300ms]" />
      </div>

      <p className="mt-4 text-sm text-white/35">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-2xl text-white/20">
        {icon}
      </div>

      <h4 className="mt-5 font-bold text-white/60">
        {title}
      </h4>

      <p className="mx-auto mt-2 max-w-md text-sm text-white/25">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   STATIC HELPERS
========================================================= */

function getInitialsStatic(name: string) {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) return "C";

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function formatDateStatic(date: string) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateStaticLong(
  date: string
) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabelStatic(
  status: string
) {
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

function getStatusClassStatic(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
    case "cancelled":
      return "border-red-400/20 bg-red-400/10 text-red-400";
    case "completed":
      return "border-blue-400/20 bg-blue-400/10 text-blue-400";
    default:
      return "border-amber-400/20 bg-amber-400/10 text-amber-400";
  }
}
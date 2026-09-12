"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeHttpUrl } from "@/lib/url";
import Image from "next/image";
import { SmartImage } from "@/components/SmartImage";
import {
  type BookedSlot,
  type Closure,
  type WeekSchedule,
  DAY_NAMES_FR,
  DEFAULT_SCHEDULE,
  DEFAULT_SLOT_INTERVAL,
  WEEK_DAYS,
  computeAvailableSlots,
  findClosure,
  formatDayHours,
  getDaySchedule,
  toDateString,
} from "@/lib/schedule";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Menu,
  Phone,
  Scissors,
  X,
} from "lucide-react";


const NAME_MAX_LENGTH = 80;
const PHONE_PATTERN = /^\+?[0-9 .-]{8,20}$/;

function isValidPhone(value: string) {
  return PHONE_PATTERN.test(value.trim());
}

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reviews, setReviews] = useState<
  {
    id: number;
    customer_name: string | null;
    rating: number;
    comment: string;
    active: boolean;
    created_at: string;
  }[]
>([]);

const [reviewName, setReviewName] = useState("");
const [reviewRating, setReviewRating] = useState(5);
const [reviewComment, setReviewComment] = useState("");
const [reviewSubmitting, setReviewSubmitting] = useState(false);
const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [gallery, setGallery] = useState<
  {
    id: number;
    image_url: string;
    title: string | null;
    active: boolean;
  }[]
>([]);
    const [services, setServices] = useState<
    {
      id: number;
      name: string;
      duration: number;
      price: number;
      image_url: string | null;
    }[]
  >([]);
const [closures, setClosures] = useState<Closure[]>([]);
const [settings, setSettings] = useState<{
  shop_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  opening_hours: string;
  instagram: string;
  facebook: string;
  maps_url: string;
  schedule: WeekSchedule;
  slot_interval: number;
}>({
  schedule: DEFAULT_SCHEDULE,
  slot_interval: DEFAULT_SLOT_INTERVAL,
  shop_name: "Chelba Coif",
  phone: "",
  whatsapp: "",
  address: "",
  opening_hours: "",
  instagram: "",
  facebook: "",
  maps_url: "",
});
  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration, price, image_url")
        .eq("active", true)
        .order("id");

      if (error) {
        console.error("Error loading services:", error);
        return;
      }

      setServices(data ?? []);
    }

    loadServices();
  }, []);
  useEffect(() => {
  async function loadGallery() {
    const { data, error } = await supabase
      .from("gallery")
      .select("id, image_url, title, active")
      .eq("active", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error loading gallery:", error);
      return;
    }

    setGallery(data ?? []);
  }

  loadGallery();
}, []);
useEffect(() => {
  async function loadReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, comment, active, created_at")
      .eq("active", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      return;
    }

    setReviews(data ?? []);
  }

  loadReviews();
}, []);
useEffect(() => {
async function loadSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Error loading settings:", error);
    return;
  }

  if (data) {
    setSettings((prev) => ({
      ...prev,
      ...data,
      schedule: data.schedule ?? DEFAULT_SCHEDULE,
      slot_interval: data.slot_interval ?? DEFAULT_SLOT_INTERVAL,
    }));
  }
}

async function loadClosures() {
  const todayStr = toDateString(new Date());

  const { data, error } = await supabase
    .from("closures")
    .select("id, start_date, end_date, reason")
    .gte("end_date", todayStr)
    .order("start_date");

  if (error) {
    console.error("Error loading closures:", error);
    return;
  }

  setClosures(data ?? []);
}

  loadSettings();
  loadClosures();
}, []);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    service: "",
    date: "",
    time: "",
    name: "",
    phone: "",
  });

  const [bookedAppointments, setBookedAppointments] = useState<BookedSlot[]>(
    []
  );

  useEffect(() => {
    async function loadBookedAppointments() {
      if (!form.date) {
        setBookedAppointments([]);
        return;
      }

      // RPC sécurisée : heures + durées uniquement, jamais de données perso.
      const { data, error } = await supabase.rpc("get_booked_slots", {
        target_date: form.date,
      });

      if (error) {
        console.error("Error loading booked slots:", error);
        setBookedAppointments([]);
        return;
      }

      setBookedAppointments(
        ((data as BookedSlot[] | null) ?? []).map((slot) => ({
          appointment_time: slot.appointment_time.slice(0, 5),
          duration: slot.duration,
        }))
      );
    }

    loadBookedAppointments();
  }, [form.date]);

  function openBooking(service = "") {
    setForm((prev) => ({
      ...prev,
      service,
      time: "",
    }));

    setConfirmed(false);
    setMobileMenuOpen(false);
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    setConfirmed(false);
  }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const customerName = form.name.trim();
  const customerPhone = form.phone.trim();

  if (
    submitting ||
    !form.service ||
    !form.date ||
    !form.time ||
    !customerName ||
    !customerPhone
  ) {
    return;
  }

  if (customerName.length > NAME_MAX_LENGTH) {
    alert(`Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères.`);
    return;
  }

  if (!isValidPhone(customerPhone)) {
    alert("Veuillez saisir un numéro de téléphone valide.");
    return;
  }

  if (form.date < today || !availableTimeSlots.includes(form.time)) {
    alert("Ce créneau n'est plus disponible. Veuillez en choisir un autre.");
    setForm((prev) => ({ ...prev, time: "" }));
    return;
  }

  const selectedService = services.find(
    (service) => service.name === form.service
  );

  if (!selectedService) {
    console.error("Service not found");
    return;
  }

  setSubmitting(true);

  const { data: existingAppointments, error: existingError } = await supabase
    .from("appointments")
    .select("id")
    .eq("appointment_date", form.date)
    .eq("appointment_time", form.time)
    .in("status", ["pending", "confirmed"])
    .limit(1);

  if (existingError) {
    console.error("Error checking appointment:", existingError);
    alert("Impossible de vérifier ce créneau. Veuillez réessayer.");
    setSubmitting(false);
    return;
  }

  if (existingAppointments && existingAppointments.length > 0) {
    alert("Ce créneau vient d'être réservé. Veuillez choisir une autre heure.");
    setForm((prev) => ({ ...prev, time: "" }));
    setSubmitting(false);
    return;
  }

  const { error } = await supabase.from("appointments").insert({
    customer_name: customerName,
    phone: customerPhone,
    service_id: selectedService.id,
    appointment_date: form.date,
    appointment_time: form.time,
    status: "pending",
  });

  setSubmitting(false);

  if (error) {
    console.error("Error creating appointment:", error);

    if (error.code === "23505") {
      alert("Ce créneau vient d'être réservé. Veuillez choisir une autre heure.");
      setForm((prev) => ({ ...prev, time: "" }));
      return;
    }

    alert("Une erreur est survenue. Veuillez réessayer.");
    return;
  }

  const message = `🔔 NOUVELLE RÉSERVATION — CHELBA COIF

✂️ Prestation : ${form.service}
📅 Date : ${form.date}
🕐 Heure : ${form.time}

👤 Client : ${customerName}
📱 Téléphone : ${customerPhone}`;

  const whatsappUrl = `https://wa.me/${settings.whatsapp.replace(
  /\D/g,
  ""
)}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, "_blank");

  setConfirmed(true);
}

  const selectedService = services.find(
    (service) => service.name === form.service
  );

  // Local Tunisia date
  const now = new Date();

  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const serviceDuration = selectedService?.duration || 30;

  const daySchedule = form.date
    ? getDaySchedule(settings.schedule, form.date)
    : null;
  const closure = form.date ? findClosure(closures, form.date) : null;
  const dayClosed = Boolean(form.date) && (!daySchedule || Boolean(closure));

  const availableTimeSlots = computeAvailableSlots({
    schedule: settings.schedule,
    closures,
    date: form.date,
    interval: settings.slot_interval,
    serviceDuration,
    booked: bookedAppointments,
    now,
  });

  async function handleReviewSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (
    reviewSubmitting ||
    !reviewName.trim() ||
    reviewName.trim().length > NAME_MAX_LENGTH ||
    reviewComment.trim().length < 5 ||
    reviewComment.trim().length > 1000 ||
    reviewRating < 1 ||
    reviewRating > 5
  ) {
    return;
  }

  setReviewSubmitting(true);

  const { error } = await supabase.from("reviews").insert({
    customer_name: reviewName.trim(),
    rating: reviewRating,
    comment: reviewComment.trim(),
    active: false,
  });

  setReviewSubmitting(false);

  if (error) {
    console.error("Error submitting review:", error);
    alert("Une erreur est survenue. Veuillez réessayer.");
    return;
  }

  setReviewName("");
  setReviewRating(5);
  setReviewComment("");
  setReviewSubmitted(true);
}

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0b0b] text-white selection:bg-white selection:text-black">
      {/* NAVBAR */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/70 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:rounded-full sm:px-6">
          <button
            onClick={() => scrollTo("top")}
            className="flex items-center gap-2.5 text-sm font-black tracking-[0.22em] transition hover:opacity-70 sm:gap-3 sm:text-base"
          >
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
            />
            {settings.shop_name || "CHELBA COIF"}
          </button>

          <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            {[
              ["services", "Services"],
              ["experience", "À propos"],
              ["gallery", "Galerie"],
              ["reviews", "Avis"],
              ["contact", "Contact"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="transition hover:text-white">
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openBooking()}
              className="rounded-full bg-white px-4 py-2.5 text-[11px] font-black tracking-wide text-black transition duration-300 hover:scale-[1.03] active:scale-95 sm:px-5 sm:text-xs"
            >
              RÉSERVER
            </button>

            <button
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-3 mt-2 rounded-2xl border border-white/10 bg-[#111111]/95 p-2 shadow-2xl backdrop-blur-2xl sm:mx-5 md:hidden"
            >
              {[
                ["services", "Services"],
                ["experience", "À propos"],
                ["gallery", "Galerie"],
                ["reviews", "Avis clients"],
                ["contact", "Contact"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  {label}
                  <ArrowRight size={15} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO */}
      <section
        id="top"
        className="relative flex min-h-[92svh] items-end overflow-hidden sm:min-h-screen"
      >
        <SmartImage
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2200&q=90"
          alt="Barber shop"
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-black/20 to-black/40" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 pt-32 sm:px-6 sm:pb-24 sm:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
  duration: 0.9,
  ease: [0.22, 1, 0.36, 1],
}}
            className="max-w-5xl"
          >
            <div className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              <span className="h-px w-8 bg-white/50" />
              Barber Shop • Djerba
            </div>

            <h1 className="max-w-5xl text-[15vw] font-black uppercase leading-[0.84] tracking-[-0.055em] sm:text-7xl lg:text-[105px]">
              La coupe
              <br />
              <span className="text-white/45">nette.</span>
              <br />
              Le style
              <br />
              qui dure.
            </h1>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => openBooking()}
className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl hover:shadow-white/10 active:scale-[0.98]"              >
                PRENDRE RENDEZ-VOUS

                <ArrowUpRight
                  size={18}
                  className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>

              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Voir les services
                <ArrowRight size={17} />
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 right-6 hidden text-right text-xs uppercase tracking-[0.2em] text-white/40 lg:block">
          Scroll to explore
          <div className="ml-auto mt-3 h-12 w-px bg-white/20" />
        </div>
      </section>

      {/* INTRO */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-white/35">
              L&apos;art du détail
            </p>

            <h2 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Votre style.
              <br />
              Notre précision.
            </h2>
          </div>

          <div>
            <p className="text-base leading-8 text-white/50 sm:text-lg">
              Une coupe réussie commence par l&apos;écoute. Chez Chelba Coif,
              chaque détail est travaillé pour créer un résultat propre,
              moderne et adapté à votre style.
            </p>

            <div className="mt-8 flex items-center gap-3 text-sm font-semibold">
              <Scissors size={18} />
              Coupes modernes & finitions précises
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-[#101010] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-white/35">
                Prestations
              </p>

              <h2 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Nos services
              </h2>
            </div>

            <p className="max-w-sm text-sm leading-6 text-white/40">
              Choisissez votre coupe et réservez votre créneau en quelques
              secondes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
             <motion.article
  key={service.name}
  initial={{ opacity: 0, y: 25 }}
  whileInView={{ opacity: 1, y: 0 }}
  whileHover={{ y: -6 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151515] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40"
              >
                <div className="relative h-56 overflow-hidden sm:h-64">
                  <SmartImage
                    src={safeHttpUrl(service.image_url) ?? ""}
                    alt={service.name}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs backdrop-blur-md">
                    {service.duration} min
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold">{service.name}</h3>

                    <span className="text-lg font-bold">
                      {service.price} DT
                    </span>
                  </div>

                  <button
                    onClick={() => openBooking(service.name)}
                   className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white hover:text-black active:scale-[0.98]"
                  >
                    Réserver cette coupe
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section
        id="experience"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28"
      >
        <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#141414] lg:grid-cols-2">
          <div className="relative min-h-[450px]">
            <SmartImage
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=90"
              alt="Barber experience"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-black/20" />

            <div className="absolute bottom-6 left-6 rounded-2xl border border-white/15 bg-black/40 px-5 py-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Chelba Coif
              </p>

              <p className="mt-1 font-bold">Djerba, Tunisie</p>
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/35">
              L&apos;expérience
            </p>

            <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] sm:text-5xl">
              Plus qu&apos;une coupe.
              <br />
              Une expérience.
            </h2>

            <p className="mt-7 max-w-lg leading-8 text-white/45">
              Un espace pensé pour prendre le temps, discuter de votre style
              et obtenir une finition à la hauteur de vos attentes.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 p-5">
                <p className="text-2xl font-black">10+</p>

                <p className="mt-1 text-xs text-white/40">
                  Prestations
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 p-5">
                <p className="text-2xl font-black">100%</p>

                <p className="mt-1 text-xs text-white/40">
                  Passion
                </p>
              </div>
            </div>

            <button
              onClick={() => openBooking()}
              className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold text-black transition hover:scale-105"
            >
              RÉSERVER
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="bg-[#101010] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-white/35">
              Inspiration
            </p>

            <h2 className="text-4xl font-black uppercase sm:text-6xl">
              Galerie
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`group relative overflow-hidden rounded-2xl ${
                  index === 0 ? "sm:row-span-2 sm:h-[530px] lg:h-[650px]" : "h-72 sm:h-80"
                }`}
              >
                <SmartImage
                  src={safeHttpUrl(image.image_url) ?? ""}
                  alt={image.title || `Chelba Coif gallery ${index + 1}`}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
{/* AVIS CLIENTS */}
<section
  id="reviews"
  className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28"
>
  <div className="mb-12">
    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-white/35">
      Avis clients
    </p>

    <h2 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
      Ce que nos clients
      <br />
      pensent de nous.
    </h2>
  </div>

  {/* APPROVED REVIEWS */}
  {reviews.length > 0 && (
    <div className="grid gap-5 md:grid-cols-2">
      {reviews.map((review) => (
        <motion.article
          key={review.id}
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -5 }}
          className="rounded-3xl border border-white/10 bg-[#141414] p-7 transition-shadow duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 sm:p-9"
        >
          <div className="text-lg tracking-wider">
            {"★".repeat(review.rating)}
            <span className="text-white/20">
              {"★".repeat(5 - review.rating)}
            </span>
          </div>

          <p className="mt-6 text-lg leading-8 text-white/65">
            « {review.comment} »
          </p>

          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="font-bold">
              {review.customer_name || "Client"}
            </p>

            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/30">
              Client Chelba Coif
            </p>
          </div>
        </motion.article>
      ))}
    </div>
  )}

  {/* REVIEW FORM */}
  <div className="mt-8 rounded-3xl border border-white/10 bg-[#141414] p-7 sm:p-9">
    {reviewSubmitted ? (
      <div className="py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
          <Check size={28} />
        </div>

        <h3 className="mt-5 text-2xl font-black uppercase">
          Merci pour votre avis !
        </h3>

        <p className="mt-3 text-sm text-white/40">
          Votre avis sera vérifié avant d&apos;être publié sur le site.
        </p>
      </div>
    ) : (
      <>
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/30">
            Votre expérience
          </p>

          <h3 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
            Laissez votre avis
          </h3>
        </div>

        <form
          onSubmit={handleReviewSubmit}
          className="grid gap-5 lg:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
              Votre nom
            </label>

            <input
              type="text"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder="Ex. Ahmed"
              required
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
              Votre note
            </label>

            <select
              value={reviewRating}
              onChange={(e) =>
                setReviewRating(Number(e.target.value))
              }
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none focus:border-white/40"
            >
              <option value={5}>★★★★★ — Excellent</option>
              <option value={4}>★★★★☆ — Très bien</option>
              <option value={3}>★★★☆☆ — Bien</option>
              <option value={2}>★★☆☆☆ — Moyen</option>
              <option value={1}>★☆☆☆☆ — À améliorer</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
              Votre commentaire
            </label>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Partagez votre expérience chez Chelba Coif..."
              rows={5}
              minLength={5}
              maxLength={1000}
              required
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={
                reviewSubmitting ||
                !reviewName.trim() ||
                reviewComment.trim().length < 5
              }
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {reviewSubmitting
                ? "ENVOI EN COURS..."
                : "PUBLIER MON AVIS"}

              <ArrowUpRight size={18} />
            </button>

            <p className="mt-3 text-center text-xs text-white/25">
              Votre avis sera publié après validation par Chelba Coif.
              Seul le nom que vous indiquez sera affiché publiquement.
            </p>
          </div>
        </form>
      </>
    )}
  </div>
</section>
      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-white px-6 py-20 text-center text-black sm:px-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-black/[0.04]" />

          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-black/[0.04]" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/40">
              Votre prochain look
            </p>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
              Prêt pour une coupe ?
            </h2>

            <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-black/50">
              Choisissez votre prestation et votre créneau. Simple, rapide
              et sans complication.
            </p>

            <button
              onClick={() => openBooking()}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-black px-8 py-4 text-sm font-bold text-white transition hover:scale-105"
            >
              RÉSERVER MAINTENANT
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <Image
                src="/logo.png"
                alt="Logo Chelba Coif"
                width={64}
                height={64}
                className="mb-4 h-16 w-16"
              />

              <p className="text-lg font-black tracking-[0.2em]">
                {settings.shop_name || "CHELBA COIF"}
              </p>

              <p className="mt-4 max-w-xs text-sm leading-7 text-white/35">
                Barber shop moderne à Djerba. Coupes précises, style
                personnalisé.
              </p>
              <div className="mt-6 flex items-center gap-3">
  {safeHttpUrl(settings.instagram) && (
    <a
      href={safeHttpUrl(settings.instagram) ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white hover:text-black"
    >
      <svg
  viewBox="0 0 24 24"
  className="h-5 w-5"
  fill="currentColor"
>
  <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.6Zm8.9 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
</svg>
    </a>
  )}

  {safeHttpUrl(settings.facebook) && (
    <a
      href={safeHttpUrl(settings.facebook) ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Facebook"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white hover:text-black"
    >
      <svg
  viewBox="0 0 24 24"
  className="h-5 w-5"
  fill="currentColor"
>
  <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.2V10H7.4v3h2.7v8h3.4Z" />
</svg>
    </a>
  )}
</div>
            </div>

            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                Contact
              </p>

              <div className="space-y-4 text-sm text-white/55">
                {/* PHONE */}
                <a
  href={`tel:${settings.phone}`}
  className="flex items-center gap-3 transition hover:text-white"
>
  <Phone size={17} />
  {settings.phone || "Téléphone non renseigné"}
</a>

                {/* LOCATION */}
                <div className="flex items-center gap-3">
                  <MapPin size={17} />
                  {settings.address || "Adresse non renseignée"}
                </div>

                {/* GOOGLE MAPS */}
                <a
                  href={safeHttpUrl(settings.maps_url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white hover:text-black"
                >
                  <MapPin size={17} />
                  Voir l&apos;itinéraire
                  <ArrowUpRight size={16} />
                </a>
                  <div className="mt-6 text-center">
    <a
      href="/admin"
      className="text-xs text-white/30 transition hover:text-white/60"
    >
      Administration
    </a>
  </div>
              </div>
            </div>

            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                Horaires
              </p>

              <div className="space-y-4 text-sm text-white/55">
                <div className="flex items-start gap-3">
  <Clock size={17} className="mt-1 shrink-0" />

  <div className="space-y-1">
    {WEEK_DAYS.map((key) => {
      const day = settings.schedule[key] ?? null;

      return (
        <div key={key} className={day ? "" : "text-white/40"}>
          {DAY_NAMES_FR[key]} : {formatDayHours(day)}
        </div>
      );
    })}
  </div>
</div>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-6 text-xs text-white/25">
            © 2026 Chelba Coif — Tous droits réservés.
          </div>
        </div>
      </footer>
      {/* FLOATING CONTACT BUTTONS */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 sm:bottom-6 sm:right-6 sm:gap-3">
        <a
          href={`tel:${settings.phone}`}
          aria-label="Appeler Chelba Coif"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-white hover:text-black active:scale-95"
        >
          <Phone size={20} />
        </a>

        <a
          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter Chelba Coif sur WhatsApp"
          className="flex h-13 w-13 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-white/10 active:scale-95"
        >
          <MessageCircle size={25} />
        </a>
      </div>
      {/* BOOKING MODAL */}
      <AnimatePresence>
        {bookingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={closeBooking}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[94svh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151515] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            >
              {/* MODAL HEADER */}
              <div className="sticky top-0 z-10 border-b border-white/10 bg-[#151515]/95 px-5 py-5 backdrop-blur-xl sm:px-8 sm:py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/30">
                      Chelba Coif
                    </p>

                    <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
                      Réserver
                    </h2>

                    <p className="mt-2 text-sm text-white/40">
                      Réservez votre prochain rendez-vous en quelques secondes.
                    </p>
                  </div>

                  <button
                    onClick={closeBooking}
                    aria-label="Fermer"
                    className="rounded-full border border-white/10 p-2.5 transition hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* CONFIRMATION */}
              {confirmed ? (
                <div className="px-6 py-12 text-center sm:px-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-xl">
                    <Check size={34} strokeWidth={2.5} />
                  </div>

                  <p className="mt-7 text-xs font-bold uppercase tracking-[0.3em] text-white/30">
                    Chelba Coif
                  </p>

                  <h3 className="mt-2 text-3xl font-black uppercase">
                    Rendez-vous demandé
                  </h3>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/40">
                    Votre demande a bien été préparée. Une confirmation devra
                    être faite par le salon.
                  </p>

                  <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] text-left">
                    <div className="border-b border-white/10 px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">
                        Votre réservation
                      </p>
                    </div>

                    <div className="space-y-4 p-5 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/35">Prestation</span>

                        <span className="text-right font-semibold">
                          {form.service}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/35">Date</span>

                        <span className="font-semibold">{form.date}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/35">Heure</span>

                        <span className="font-semibold">{form.time}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/35">Client</span>

                        <span className="text-right font-semibold">
                          {form.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/35">Prix</span>

                        <span className="font-black">
                          {selectedService?.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={closeBooking}
                    className="mt-6 w-full rounded-xl bg-white py-4 text-sm font-black text-black transition hover:scale-[1.02] hover:bg-white/90"
                  >
                    TERMINER
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="px-5 py-6 sm:px-8 sm:py-7"
                >
                  {/* STEP 01 */}
                  <div>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                        01
                      </span>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                          Première étape
                        </p>

                        <h3 className="mt-1 text-lg font-bold">
                          Choisissez votre prestation
                        </h3>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map((service) => {
                        const selected =
                          form.service === service.name;

                        return (
                          <button
                            key={service.name}
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                service: service.name,
                                time: "",
                              })
                            }
                            className={`group rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-white bg-white text-black shadow-lg"
                                : "border-white/10 bg-[#0d0d0d] hover:border-white/25 hover:bg-[#111111]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">
                                  {service.name}
                                </p>

                                <div
                                  className={`mt-1 flex items-center gap-2 text-xs ${
                                    selected
                                      ? "text-black/50"
                                      : "text-white/30"
                                  }`}
                                >
                                  <Clock size={13} />
                                  {service.duration} min
                                </div>
                              </div>

                              <span className="font-black">
                                {service.price} DT
                              </span>
                            </div>

                            {selected && (
                              <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                <Check size={14} />
                                Sélectionné
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STEP 02 */}
                  <div className="mt-9">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                        02
                      </span>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                          Deuxième étape
                        </p>

                        <h3 className="mt-1 text-lg font-bold">
                          Choisissez votre créneau
                        </h3>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* DATE */}
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                          Date
                        </label>

                        <div className="relative">
                          <CalendarDays
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                          />

                          <input
                            type="date"
                            value={form.date}
                            min={today}
                            onChange={(e) => {
                              const selected = e.target.value;

                              setForm({
                                ...form,
                                date: selected,
                                time: "",
                              });
                            }}
                            required
                            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 pl-11 text-sm text-white outline-none transition focus:border-white/40"
                          />
                        </div>

                        {dayClosed && (
                          <p className="mt-2 text-xs font-semibold text-white/40">
                            {closure
                              ? `Le salon est fermé${
                                  closure.reason ? ` : ${closure.reason}` : " ce jour-là"
                                }.`
                              : "Le salon est fermé ce jour-là."}
                          </p>
                        )}

                        {form.date && !dayClosed && daySchedule && (
                          <p className="mt-2 text-xs text-white/25">
                            {DAY_NAMES_FR[String(new Date(`${form.date}T12:00:00`).getDay())]}{" "}
                            : {formatDayHours(daySchedule)}
                          </p>
                        )}
                      </div>

                      {/* TIME */}
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                          Heure
                        </label>

                        <div className="relative">
                          <Clock
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                          />

<select
  value={form.time}
  disabled={!form.date || dayClosed}
  onChange={(e) =>
    setForm({
      ...form,
      time: e.target.value,
    })
  }
  required
  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 pl-11 text-sm text-white outline-none transition focus:border-white/40"
>
  <option value="">
    {!form.date
      ? "Choisissez d'abord une date"
      : dayClosed
      ? "Salon fermé"
      : availableTimeSlots.length === 0
      ? "Aucun créneau disponible"
      : "Choisir une heure"}
  </option>

  {availableTimeSlots.map((time) => (
    <option key={time} value={time}>
      {time}
    </option>
  ))}
</select>
                        </div>

                        {form.date && !dayClosed && selectedService && (
                          <p className="mt-2 text-xs text-white/25">
                            Durée : {serviceDuration} min
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STEP 03 */}
                  <div className="mt-9">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                        03
                      </span>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                          Dernière étape
                        </p>

                        <h3 className="mt-1 text-lg font-bold">
                          Vos informations
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                          Nom complet
                        </label>

                        <input
                          type="text"
                          placeholder="Ex. Ahmed Ben Ali"
                          autoComplete="name"
                          maxLength={NAME_MAX_LENGTH}
                          value={form.name}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              name: e.target.value,
                            })
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                          Numéro de téléphone
                        </label>

                        <input
                          type="tel"
                          placeholder="+216 XX XXX XXX"
                          autoComplete="tel"
                          inputMode="tel"
                          maxLength={20}
                          pattern="\+?[0-9 .-]{8,20}"
                          title="8 à 20 chiffres, ex. +216 50 882 529"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              phone: e.target.value,
                            })
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/40"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY */}
                  <AnimatePresence>
                    {form.service &&
                      form.date &&
                      form.time && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 10,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                                Récapitulatif
                              </p>

                              <p className="mt-2 font-bold">
                                {form.service}
                              </p>
                            </div>

                            <span className="text-lg font-black">
                              {selectedService?.price}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm text-white/50 sm:grid-cols-2">
                            <div className="flex items-center gap-3">
                              <CalendarDays size={17} />
                              <span>{form.date}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <Clock size={17} />
                              <span>{form.time}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>

                  {/* CONFIRM BUTTON */}
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !form.service ||
                      !form.date ||
                      !form.time ||
                      !form.name.trim() ||
                      !form.phone.trim()
                    }
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-4 text-sm font-black text-black shadow-xl transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                  >
                    {submitting ? "ENVOI EN COURS..." : "CONFIRMER MON RENDEZ-VOUS"}
                    <ArrowUpRight size={18} />
                  </button>

                  <p className="mt-4 text-center text-xs leading-5 text-white/20">
                    En confirmant, votre demande de rendez-vous sera
                    préparée pour Chelba Coif. Votre nom et votre numéro
                    servent uniquement à gérer ce rendez-vous et ne sont
                    jamais partagés.
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Phone,
  Scissors,
  X,
} from "lucide-react";

const services = [
  {
    name: "Low Fade",
    duration: "30 min",
    price: "20 DT",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Mid Fade",
    duration: "30 min",
    price: "20 DT",
    image:
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "High Fade",
    duration: "30 min",
    price: "22 DT",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Taper Fade",
    duration: "25 min",
    price: "18 DT",
    image:
      "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Skin Fade",
    duration: "35 min",
    price: "25 DT",
    image:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Coupe classique",
    duration: "30 min",
    price: "18 DT",
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Coupe aux ciseaux",
    duration: "35 min",
    price: "20 DT",
    image:
      "https://images.unsplash.com/photo-1593702295094-aea3c0a2a7f7?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Buzz Cut",
    duration: "20 min",
    price: "15 DT",
    image:
      "https://images.unsplash.com/photo-1599351431613-18ef1fdd27e1?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Barbe",
    duration: "20 min",
    price: "12 DT",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Coupe + Barbe",
    duration: "45 min",
    price: "30 DT",
    image:
      "https://images.unsplash.com/photo-1622288432450-277d0fef5ed8?auto=format&fit=crop&w=1000&q=85",
  },
];

const gallery = [
  "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85",
];

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [form, setForm] = useState({
    service: "",
    date: "",
    time: "",
    name: "",
    phone: "",
  });

  function openBooking(service = "") {
    setForm((prev) => ({
      ...prev,
      service,
      time: "",
    }));

    setConfirmed(false);
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    setConfirmed(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.service ||
      !form.date ||
      !form.time ||
      !form.name ||
      !form.phone
    ) {
      return;
    }

    const message = `🔔 NOUVELLE RÉSERVATION — CHELBA COIF

✂️ Prestation : ${form.service}
📅 Date : ${form.date}
🕐 Heure : ${form.time}

👤 Client : ${form.name}
📱 Téléphone : ${form.phone}`;

    const whatsappUrl = `https://wa.me/21650882529?text=${encodeURIComponent(
      message
    )}`;

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

  const selectedDate = form.date
    ? new Date(`${form.date}T12:00:00`)
    : null;

  const selectedDay = selectedDate?.getDay();

  const isSunday = selectedDay === 0;
  const isSaturday = selectedDay === 6;

  const openingTime = "09:00";
  const closingTime = isSaturday ? "20:00" : "19:00";

  const allTimeSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
  ];

  // Convert "30 min" -> 30
  const serviceDuration = selectedService
    ? parseInt(selectedService.duration)
    : 30;

  const availableTimeSlots = allTimeSlots.filter((time) => {
    if (!selectedDate || isSunday) {
      return false;
    }

    // Lunch break: 12:30 - 14:00
    if (time === "12:30") {
      return false;
    }

    // Convert selected time to minutes
    const [hours, minutes] = time.split(":").map(Number);

    const startMinutes = hours * 60 + minutes;

    // Convert closing time to minutes
    const [closingHours, closingMinutes] = closingTime
      .split(":")
      .map(Number);

    const closingMinutesTotal =
      closingHours * 60 + closingMinutes;

    // Appointment must finish before closing
    const endMinutes = startMinutes + serviceDuration;

    if (endMinutes > closingMinutesTotal) {
      return false;
    }

    // Don't allow times before opening
    if (time < openingTime) {
      return false;
    }

    // Don't allow times already passed today
    if (form.date === today) {
      const currentTime = new Date();

      const currentMinutes =
        currentTime.getHours() * 60 +
        currentTime.getMinutes();

      if (startMinutes <= currentMinutes) {
        return false;
      }
    }

    return true;
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white">
      {/* NAVBAR */}
      <header className="fixed left-0 right-0 top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <nav className="flex items-center justify-between rounded-full border border-white/10 bg-black/65 px-5 py-3 backdrop-blur-xl sm:px-6">
            <a
              href="#top"
              className="text-sm font-black tracking-[0.25em] sm:text-base"
            >
              CHELBA COIF
            </a>

            <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <a href="#services" className="transition hover:text-white">
                Services
              </a>

              <a href="#experience" className="transition hover:text-white">
                À propos
              </a>

              <a href="#gallery" className="transition hover:text-white">
                Galerie
              </a>

              <a href="#contact" className="transition hover:text-white">
                Contact
              </a>
            </div>

            <button
              onClick={() => openBooking()}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:scale-105 sm:text-sm"
            >
              RÉSERVER
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        id="top"
        className="relative flex min-h-[92vh] items-end overflow-hidden sm:min-h-screen"
      >
        <img
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2200&q=90"
          alt="Barber shop"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-black/20 to-black/40" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-36 sm:px-6 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl"
          >
            <div className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              <span className="h-px w-8 bg-white/50" />
              Barber Shop • Djerba
            </div>

            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.04em] sm:text-7xl lg:text-[110px]">
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
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold text-black transition hover:scale-[1.03]"
              >
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
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-white/35">
              L'art du détail
            </p>

            <h2 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Votre style.
              <br />
              Notre précision.
            </h2>
          </div>

          <div>
            <p className="text-base leading-8 text-white/50 sm:text-lg">
              Une coupe réussie commence par l'écoute. Chez Chelba Coif,
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
      <section id="services" className="bg-[#101010] py-24 sm:py-32">
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <motion.article
                key={service.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151515]"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs backdrop-blur-md">
                    {service.duration}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold">{service.name}</h3>

                    <span className="text-lg font-bold">
                      {service.price}
                    </span>
                  </div>

                  <button
                    onClick={() => openBooking(service.name)}
                    className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold transition hover:border-white/30 hover:bg-white hover:text-black"
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
        className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32"
      >
        <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#141414] lg:grid-cols-2">
          <div className="relative min-h-[450px]">
            <img
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=90"
              alt="Barber experience"
              className="absolute inset-0 h-full w-full object-cover"
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
              L'expérience
            </p>

            <h2 className="mt-5 text-4xl font-black uppercase leading-[0.95] sm:text-5xl">
              Plus qu'une coupe.
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
      <section id="gallery" className="bg-[#101010] py-24 sm:py-32">
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
                key={image}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`group overflow-hidden rounded-2xl ${
                  index === 0 ? "lg:row-span-2 lg:h-[660px]" : "h-80"
                }`}
              >
                <img
                  src={image}
                  alt={`Chelba Coif gallery ${index + 1}`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32">
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
              <p className="text-lg font-black tracking-[0.2em]">
                CHELBA COIF
              </p>

              <p className="mt-4 max-w-xs text-sm leading-7 text-white/35">
                Barber shop moderne à Djerba. Coupes précises, style
                personnalisé.
              </p>
            </div>

            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                Contact
              </p>

              <div className="space-y-4 text-sm text-white/55">
                <div className="flex items-center gap-3">
                  <Phone size={17} />
                  50 882 529
                </div>

                <div className="flex items-center gap-3">
                  <MapPin size={17} />
                  Djerba, Tunisie
                </div>
              </div>
            </div>

            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                Horaires
              </p>

              <div className="space-y-4 text-sm text-white/55">
                <div className="flex items-center gap-3">
                  <Clock size={17} />
                  Lun – Ven : 09:00 – 19:00
                </div>

                <div className="ml-7">
                  Sam : 09:00 – 20:00
                </div>

                <div className="ml-7 text-white/30">
                  Dimanche : fermé
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/10 pt-6 text-xs text-white/25">
            © 2026 Chelba Coif — Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* BOOKING MODAL */}
      <AnimatePresence>
        {bookingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={closeBooking}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#151515] shadow-2xl"
            >
              {/* MODAL HEADER */}
              <div className="sticky top-0 z-10 border-b border-white/10 bg-[#151515]/95 px-6 py-6 backdrop-blur-xl sm:px-8">
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
                  className="px-6 py-7 sm:px-8"
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
                                  {service.duration}
                                </div>
                              </div>

                              <span className="font-black">
                                {service.price}
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

                              const date = new Date(
                                `${selected}T12:00:00`
                              );

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

                        {form.date && isSunday && (
                          <p className="mt-2 text-xs font-semibold text-white/40">
                            Le salon est fermé le dimanche.
                          </p>
                        )}

                        {form.date && !isSunday && (
                          <p className="mt-2 text-xs text-white/25">
                            {isSaturday
                              ? "Samedi : 09:00 – 20:00"
                              : "Lundi – Vendredi : 09:00 – 19:00"}
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
                            disabled={!form.date || isSunday}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                time: e.target.value,
                              })
                            }
                            required
                            className="w-full appearance-none rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-4 pl-11 text-sm text-white outline-none transition focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <option value="">
                              {!form.date
                                ? "Choisissez d'abord une date"
                                : isSunday
                                ? "Salon fermé le dimanche"
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

                        {form.date &&
                          !isSunday &&
                          form.date === today &&
                          availableTimeSlots.length === 0 && (
                            <p className="mt-2 text-xs text-white/35">
                              Tous les créneaux restants sont passés ou
                              indisponibles aujourd'hui.
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
                      !form.service ||
                      !form.date ||
                      !form.time ||
                      !form.name ||
                      !form.phone
                    }
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-4 text-sm font-black text-black shadow-xl transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                  >
                    CONFIRMER MON RENDEZ-VOUS
                    <ArrowUpRight size={18} />
                  </button>

                  <p className="mt-4 text-center text-xs leading-5 text-white/20">
                    En confirmant, votre demande de rendez-vous sera
                    préparée pour Chelba Coif.
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
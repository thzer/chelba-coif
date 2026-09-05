"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  image_url: string | null;
  active: boolean;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("id");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setServices(data ?? []);
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

      loadServices();
    }

    checkAuth();
  }, []);

  function updateService(
    id: number,
    field: keyof Service,
    value: string | number | boolean
  ) {
    setServices((current) =>
      current.map((service) =>
        service.id === id
          ? { ...service, [field]: value }
          : service
      )
    );
  }

  async function saveService(service: Service) {
    setSaving(service.id);

    const { error } = await supabase
      .from("services")
      .update({
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        image_url: service.image_url,
        active: service.active,
      })
      .eq("id", service.id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde.");
    } else {
      alert("Service sauvegardé avec succès.");
    }

    setSaving(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">Chelba Coif</h1>
            <p className="text-sm text-white/50">Gestion des services</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() =>
                (window.location.href = "/admin/dashboard")
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Rendez-vous
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Services</h2>
          <p className="mt-2 text-white/50">
            Modifiez les prestations, prix et durées.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Chargement...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Nom
                    </label>

                    <input
                      value={service.name}
                      onChange={(e) =>
                        updateService(
                          service.id,
                          "name",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Description
                    </label>

                    <textarea
                      value={service.description ?? ""}
                      onChange={(e) =>
                        updateService(
                          service.id,
                          "description",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Prix (DT)
                      </label>

                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) =>
                          updateService(
                            service.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Durée (min)
                      </label>

                      <input
                        type="number"
                        value={service.duration}
                        onChange={(e) =>
                          updateService(
                            service.id,
                            "duration",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      URL de l'image
                    </label>

                    <input
                      value={service.image_url ?? ""}
                      onChange={(e) =>
                        updateService(
                          service.id,
                          "image_url",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={service.active}
                      onChange={(e) =>
                        updateService(
                          service.id,
                          "active",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4"
                    />
                    Service visible sur le site
                  </label>

                  <button
                    onClick={() => saveService(service)}
                    disabled={saving === service.id}
                    className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:scale-[1.01] disabled:opacity-50"
                  >
                    {saving === service.id
                      ? "Sauvegarde..."
                      : "Sauvegarder"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GalleryItem = {
  id: number;
  image_url: string;
  title: string | null;
  active: boolean;
};

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function loadGallery() {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setGallery(data ?? []);
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

      loadGallery();
    }

    checkAuth();
  }, []);

  async function addImage(e: React.FormEvent) {
    e.preventDefault();

    if (!imageUrl.trim()) return;

    setAdding(true);

    const { error } = await supabase.from("gallery").insert({
      image_url: imageUrl.trim(),
      title: title.trim() || null,
      active: true,
    });

    if (error) {
      console.error(error);
      alert("Erreur lors de l'ajout.");
      setAdding(false);
      return;
    }

    setImageUrl("");
    setTitle("");

    await loadGallery();

    setAdding(false);
  }

  async function toggleImage(item: GalleryItem) {
    const { error } = await supabase
      .from("gallery")
      .update({ active: !item.active })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      return;
    }

    setGallery((current) =>
      current.map((image) =>
        image.id === item.id
          ? { ...image, active: !item.active }
          : image
      )
    );
  }

  async function deleteImage(id: number) {
    const confirmed = window.confirm(
      "Supprimer cette image définitivement ?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("gallery")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la suppression.");
      return;
    }

    setGallery((current) =>
      current.filter((image) => image.id !== id)
    );
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
            <p className="text-sm text-white/50">
              Gestion de la galerie
            </p>
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
          <h2 className="text-3xl font-bold">Galerie</h2>
          <p className="mt-2 text-white/50">
            Ajoutez et gérez les photos du salon.
          </p>
        </div>

        <form
          onSubmit={addImage}
          className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h3 className="mb-5 text-xl font-semibold">
            Ajouter une image
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de l'image"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre (optionnel)"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {adding ? "Ajout..." : "Ajouter l'image"}
          </button>
        </form>

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Chargement...
          </div>
        ) : gallery.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Aucune image dans la galerie.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-white/5">
                  <img
                    src={item.image_url}
                    alt={item.title || "Galerie Chelba Coif"}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <h3 className="font-semibold">
                    {item.title || "Sans titre"}
                  </h3>

                  <p className="mt-1 text-xs text-white/40">
                    {item.active ? "Visible sur le site" : "Masquée"}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => toggleImage(item)}
                      className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
                    >
                      {item.active ? "Masquer" : "Afficher"}
                    </button>

                    <button
                      onClick={() => deleteImage(item.id)}
                      className="rounded-xl border border-red-400/30 px-3 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
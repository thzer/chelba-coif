"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Review = {
  id: number;
  customer_name: string | null;
  rating: number;
  comment: string;
  active: boolean;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function loadReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setReviews(data ?? []);
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

      loadReviews();
    }

    checkAuth();
  }, []);

  async function addReview(e: React.FormEvent) {
    e.preventDefault();

    if (!comment.trim()) return;

    setAdding(true);

    const { error } = await supabase.from("reviews").insert({
      customer_name: customerName.trim() || null,
      rating,
      comment: comment.trim(),
      active: true,
    });

    if (error) {
      console.error(error);
      alert("Erreur lors de l'ajout de l'avis.");
      setAdding(false);
      return;
    }

    setCustomerName("");
    setRating(5);
    setComment("");

    await loadReviews();

    setAdding(false);
  }

  function updateReview(
    id: number,
    field: keyof Review,
    value: string | number | boolean
  ) {
    setReviews((current) =>
      current.map((review) =>
        review.id === id
          ? { ...review, [field]: value }
          : review
      )
    );
  }

  async function saveReview(review: Review) {
    setSaving(review.id);

    const { error } = await supabase
      .from("reviews")
      .update({
        customer_name: review.customer_name,
        rating: review.rating,
        comment: review.comment,
        active: review.active,
      })
      .eq("id", review.id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde.");
    } else {
      alert("Avis sauvegardé avec succès.");
    }

    setSaving(null);
  }

  async function toggleReview(review: Review) {
    const newActive = !review.active;

    const { error } = await supabase
      .from("reviews")
      .update({ active: newActive })
      .eq("id", review.id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la modification.");
      return;
    }

    setReviews((current) =>
      current.map((item) =>
        item.id === review.id
          ? { ...item, active: newActive }
          : item
      )
    );
  }

  async function deleteReview(id: number) {
    const confirmed = window.confirm(
      "Supprimer cet avis définitivement ?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la suppression.");
      return;
    }

    setReviews((current) =>
      current.filter((review) => review.id !== id)
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
              Gestion des avis clients
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                (window.location.href = "/admin/dashboard")
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Rendez-vous
            </button>

            <button
              onClick={() =>
                (window.location.href = "/admin/services")
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Services
            </button>

            <button
              onClick={() =>
                (window.location.href = "/admin/gallery")
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Galerie
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
          <h2 className="text-3xl font-bold">Avis clients</h2>
          <p className="mt-2 text-white/50">
            Ajoutez et gérez les avis affichés sur le site.
          </p>
        </div>

        {/* ADD REVIEW */}
        <form
          onSubmit={addReview}
          className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h3 className="mb-5 text-xl font-semibold">
            Ajouter un avis
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/60">
                Nom du client
              </label>

              <input
                type="text"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(e.target.value)
                }
                placeholder="Ex: Ahmed"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">
                Note
              </label>

              <select
                value={rating}
                onChange={(e) =>
                  setRating(Number(e.target.value))
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
              >
                <option value={5}>★★★★★ — 5/5</option>
                <option value={4}>★★★★☆ — 4/5</option>
                <option value={3}>★★★☆☆ — 3/5</option>
                <option value={2}>★★☆☆☆ — 2/5</option>
                <option value={1}>★☆☆☆☆ — 1/5</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">
                Commentaire
              </label>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Écrivez l'avis du client..."
                rows={4}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50"
            >
              {adding ? "Ajout..." : "Ajouter l'avis"}
            </button>
          </div>
        </form>

        {/* REVIEWS */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Chargement...
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50">
            Aucun avis pour le moment.
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Nom du client
                    </label>

                    <input
                      value={review.customer_name ?? ""}
                      onChange={(e) =>
                        updateReview(
                          review.id,
                          "customer_name",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Note
                    </label>

                    <select
                      value={review.rating}
                      onChange={(e) =>
                        updateReview(
                          review.id,
                          "rating",
                          Number(e.target.value)
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    >
                      <option value={5}>★★★★★ — 5/5</option>
                      <option value={4}>★★★★☆ — 4/5</option>
                      <option value={3}>★★★☆☆ — 3/5</option>
                      <option value={2}>★★☆☆☆ — 2/5</option>
                      <option value={1}>★☆☆☆☆ — 1/5</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Commentaire
                    </label>

                    <textarea
                      value={review.comment}
                      onChange={(e) =>
                        updateReview(
                          review.id,
                          "comment",
                          e.target.value
                        )
                      }
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={review.active}
                      onChange={(e) =>
                        updateReview(
                          review.id,
                          "active",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4"
                    />
                    Avis visible sur le site
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => saveReview(review)}
                      disabled={saving === review.id}
                      className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      {saving === review.id
                        ? "Sauvegarde..."
                        : "Sauvegarder"}
                    </button>

                    <button
                      onClick={() => toggleReview(review)}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/10"
                    >
                      {review.active ? "Masquer" : "Afficher"}
                    </button>

                    <button
                      onClick={() => deleteReview(review.id)}
                      className="rounded-xl border border-red-400/30 px-5 py-3 text-sm text-red-400 transition hover:bg-red-400/10"
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
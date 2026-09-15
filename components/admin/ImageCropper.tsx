"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Move, ZoomIn } from "lucide-react";

type Props = {
  /** Fichier choisi par l'utilisateur. */
  file: File;
  /** Largeur / hauteur du cadre (1 = carré, 4/3 = paysage, 3/4 = portrait). */
  aspect: number;
  title: string;
  /** Aide affichée sous le cadre (où l'image sera utilisée). */
  hint?: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

const OUTPUT_WIDTH = 1400; // largeur max de l'image enregistrée
const MAX_ZOOM = 4;

/**
 * Recadrage avant envoi : l'utilisateur déplace et zoome l'image dans un cadre
 * au format exact utilisé par le site, puis seule cette zone est enregistrée.
 * Aucune dépendance externe : rendu CSS + export via <canvas>.
 */
export function ImageCropper({ file, aspect, title, hint, onCancel, onDone }: Props) {
  // Data URL : pas de revocation à gérer (le double montage de React en
  // développement invalidait une URL d.objet avant le chargement).
  const [src, setSrc] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  /** null tant que l'utilisateur n'a pas déplacé l'image (= centrée). */
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(file);

    return () => reader.abort();
  }, [file]);

  // Taille réelle du cadre à l'écran (ResizeObserver : mise à jour asynchrone).
  const frameRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setFrame({ w: box.width, h: box.height });
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  // Échelle « cover » : l'image remplit toujours le cadre
  const baseScale =
    image && frame.w
      ? Math.max(frame.w / image.naturalWidth, frame.h / image.naturalHeight)
      : 1;
  const scale = baseScale * zoom;
  const displayW = image ? image.naturalWidth * scale : 0;
  const displayH = image ? image.naturalHeight * scale : 0;

  const clamp = useCallback(
    (point: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(frame.w - displayW, point.x)),
      y: Math.min(0, Math.max(frame.h - displayH, point.y)),
    }),
    [frame.w, frame.h, displayW, displayH]
  );

  // Position effective : centrée tant que l'utilisateur n'a rien déplacé.
  const position = clamp(
    offset ?? { x: (frame.w - displayW) / 2, y: (frame.h - displayH) / 2 }
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: position.x, oy: position.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(
      clamp({
        x: drag.current.ox + (e.clientX - drag.current.x),
        y: drag.current.oy + (e.clientY - drag.current.y),
      })
    );
  }

  function onPointerUp() {
    drag.current = null;
  }

  function changeZoom(next: number) {
    if (!image || !frame.w) return;

    const nextZoom = Math.min(MAX_ZOOM, Math.max(1, next));
    const ratio = nextZoom / zoom;
    const cx = frame.w / 2;
    const cy = frame.h / 2;

    // Garde le centre du cadre sur le même point de l'image
    const nextW = image.naturalWidth * baseScale * nextZoom;
    const nextH = image.naturalHeight * baseScale * nextZoom;

    setZoom(nextZoom);
    setOffset({
      x: Math.min(0, Math.max(frame.w - nextW, cx - (cx - position.x) * ratio)),
      y: Math.min(0, Math.max(frame.h - nextH, cy - (cy - position.y) * ratio)),
    });
  }

  async function apply() {
    if (!image || !frame.w) return;
    setBusy(true);

    try {
      const outW = Math.min(OUTPUT_WIDTH, Math.round(image.naturalWidth / zoom));
      const outH = Math.round(outW / aspect);
      const k = outW / frame.w; // cadre écran → canvas

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, position.x * k, position.y * k, displayW * k, displayH * k);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88)
      );
      if (!blob) throw new Error("blob");

      const name = file.name.replace(/\.[^.]+$/, "") || "photo";
      onDone(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
    } catch (e) {
      console.error(e);
      alert("Recadrage impossible. Réessayez avec une autre photo.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-5">
      <div className="max-h-[95svh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-black">{title}</h3>
          <p className="mt-0.5 text-xs text-white/40">
            Déplacez et zoomez : seule la zone visible sera enregistrée.
          </p>
        </div>

        <div className="p-5">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ aspectRatio: String(aspect) }}
            className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-white/15 bg-black active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src || undefined}
              alt=""
              draggable={false}
              onLoad={(e) => setImage(e.currentTarget)}
              style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                width: displayW || undefined,
                height: displayH || undefined,
                maxWidth: "none",
                visibility: image ? "visible" : "hidden",
              }}
            />

            {/* repères de composition */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/15" />
            </div>

            {!image && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
                Chargement…
              </p>
            )}
          </div>

          {hint && <p className="mt-3 text-xs text-white/35">{hint}</p>}

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn size={16} className="shrink-0 text-white/40" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
            <Move size={12} /> Glissez l&apos;image pour choisir la partie visible
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={!image || busy}
              className="flex-1 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? "Traitement…" : "Utiliser cette photo"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "error" | "success" | "info";

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
};

/**
 * Notifications non bloquantes (remplacent `alert()`).
 * `notify(kind, title, text?)` ajoute un message qui disparaît tout seul.
 */
export function useToasts(autoHideMs = 6000) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastKind, title: string, text?: string) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-2), { id, kind, title, text }]);
      window.setTimeout(() => dismiss(id), autoHideMs);
      return id;
    },
    [autoHideMs, dismiss]
  );

  return { toasts, notify, dismiss };
}

const styles: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  error: {
    box: "border-red-400/30 bg-[#1a0d0d] text-red-50",
    icon: <AlertTriangle size={20} className="text-red-400" />,
  },
  success: {
    box: "border-emerald-400/30 bg-[#0d1a13] text-emerald-50",
    icon: <CheckCircle2 size={20} className="text-emerald-400" />,
  },
  info: {
    box: "border-white/15 bg-[#161616] text-white",
    icon: <Info size={20} className="text-white/70" />,
  },
};

export function ToastViewport({
  toasts,
  onDismiss,
  closeLabel = "Fermer",
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
  closeLabel?: string;
}) {
  // Échap ferme le dernier message.
  useEffect(() => {
    if (toasts.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss(toasts[toasts.length - 1].id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toasts, onDismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = styles[toast.kind];
          return (
            <motion.div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl ${style.box}`}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5">{toast.title}</p>
                {toast.text && (
                  <p className="mt-0.5 text-sm leading-5 opacity-75">{toast.text}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label={closeLabel}
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

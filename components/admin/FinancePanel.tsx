"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/schedule";
import type { Barber } from "@/lib/schedule";

type Appointment = {
  id: number;
  appointment_date: string;
  status: string;
  barber_id: number | null;
  cancelled_by?: string | null;
  services: { name: string; price: number; cost?: number | null }[] | null;
  barbers: { name: string }[] | null;
};

type Expense = {
  id: number;
  expense_date: string;
  label: string;
  category: string;
  amount: number;
};

type Period = "7d" | "30d" | "month" | "last_month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "month", label: "Ce mois" },
  { id: "last_month", label: "Mois dernier" },
  { id: "year", label: "Cette année" },
];

const CATEGORIES: Record<string, string> = {
  loyer: "Loyer",
  produits: "Produits",
  salaires: "Salaires",
  energie: "Eau / électricité",
  materiel: "Matériel",
  marketing: "Marketing",
  autre: "Autre",
};

const BAR_COLOR = "#059669"; // validé pour le fond sombre (dataviz)

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function periodRange(period: Period, now = new Date()): { from: string; to: string } {
  const today = toDateString(now);
  if (period === "7d") return { from: toDateString(addDays(now, -6)), to: today };
  if (period === "30d") return { from: toDateString(addDays(now, -29)), to: today };
  if (period === "month") {
    return { from: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (period === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toDateString(first), to: toDateString(last) };
  }
  return { from: toDateString(new Date(now.getFullYear(), 0, 1)), to: today };
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25";

/**
 * Finances : chiffre d'affaires, coûts, commissions, dépenses et marge nette
 * sur une période, par jour et par coiffeur. Calculé à partir des RDV terminés.
 */
export function FinancePanel({ appointments, barbers }: { appointments: Appointment[]; barbers: Barber[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("produits");
  const [expDate, setExpDate] = useState(() => toDateString(new Date()));
  const [saving, setSaving] = useState(false);

  const { from, to } = periodRange(period);

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, expense_date, label, category, amount")
      .order("expense_date", { ascending: false })
      .limit(500);
    if (error) console.error(error);
    setExpenses((data ?? []) as Expense[]);
  }

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("expenses")
      .select("id, expense_date, label, category, amount")
      .order("expense_date", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!cancelled) setExpenses((data ?? []) as Expense[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const inPeriod = appointments.filter((a) => a.appointment_date >= from && a.appointment_date <= to);
    const completed = inPeriod.filter((a) => a.status === "completed");
    const commissionOf = (a: Appointment) => {
      const b = barbers.find((x) => x.id === a.barber_id);
      if (!b || b.is_owner) return 0;
      return (Number(a.services?.[0]?.price ?? 0) * (b.commission_pct ?? 0)) / 100;
    };

    const revenue = completed.reduce((s, a) => s + Number(a.services?.[0]?.price ?? 0), 0);
    const productCost = completed.reduce((s, a) => s + Number(a.services?.[0]?.cost ?? 0), 0);
    const commissions = completed.reduce((s, a) => s + commissionOf(a), 0);
    const periodExpenses = expenses.filter((e) => e.expense_date >= from && e.expense_date <= to);
    const expensesTotal = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const net = revenue - productCost - commissions - expensesTotal;
    const marginPct = revenue > 0 ? (net / revenue) * 100 : 0;
    const avgTicket = completed.length ? revenue / completed.length : 0;
    const cancelledClient = inPeriod.filter((a) => a.status === "cancelled" && a.cancelled_by === "client").length;
    const cancelledSalon = inPeriod.filter((a) => a.status === "cancelled" && a.cancelled_by !== "client").length;

    // Série journalière (ou hebdomadaire si la période dépasse 45 jours)
    const days: string[] = [];
    for (let d = new Date(`${from}T12:00:00`); toDateString(d) <= to; d = addDays(d, 1)) {
      days.push(toDateString(d));
    }
    const weekly = days.length > 45;
    const buckets = new Map<string, number>();
    const keyOf = (date: string) => {
      if (!weekly) return date;
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return toDateString(d);
    };
    for (const day of days) buckets.set(keyOf(day), buckets.get(keyOf(day)) ?? 0);
    for (const a of completed) {
      const k = keyOf(a.appointment_date);
      buckets.set(k, (buckets.get(k) ?? 0) + Number(a.services?.[0]?.price ?? 0));
    }
    const series = [...buckets.entries()].map(([date, value]) => ({ date, value }));

    const perBarber = barbers.map((b) => {
      const mine = completed.filter((a) => a.barber_id === b.id);
      const rev = mine.reduce((s, a) => s + Number(a.services?.[0]?.price ?? 0), 0);
      const cost = mine.reduce((s, a) => s + Number(a.services?.[0]?.cost ?? 0), 0);
      const com = b.is_owner ? 0 : (rev * (b.commission_pct ?? 0)) / 100;
      return { barber: b, count: mine.length, revenue: rev, commission: com, margin: rev - cost - com };
    });

    return {
      completedCount: completed.length,
      revenue,
      productCost,
      commissions,
      expensesTotal,
      periodExpenses,
      net,
      marginPct,
      avgTicket,
      cancelledClient,
      cancelledSalon,
      series,
      weekly,
      perBarber,
    };
  }, [appointments, barbers, expenses, from, to]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(expAmount);
    if (!expLabel.trim() || !Number.isFinite(amount) || amount < 0) return;

    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      expense_date: expDate,
      label: expLabel.trim(),
      category: expCategory,
      amount,
    });
    setSaving(false);

    if (error) {
      console.error(error);
      alert("Impossible d'ajouter cette dépense.");
      return;
    }
    setExpLabel("");
    setExpAmount("");
    await loadExpenses();
  }

  async function removeExpense(exp: Expense) {
    if (!confirm(`Supprimer « ${exp.label} » (${fmt(exp.amount)} DT) ?`)) return;
    const { error } = await supabase.from("expenses").delete().eq("id", exp.id);
    if (error) {
      console.error(error);
      alert("Impossible de supprimer cette dépense.");
      return;
    }
    setExpenses((c) => c.filter((x) => x.id !== exp.id));
  }

  // ---- chart geometry
  const W = 720, H = 220, PAD_L = 44, PAD_R = 12, PAD_T = 18, PAD_B = 28;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const maxVal = Math.max(1, ...stats.series.map((s) => s.value));
  const niceMax = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const m = maxVal / p;
    const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
    return step * p;
  })();
  const ticks = [0, niceMax / 2, niceMax];
  const n = stats.series.length;
  const band = n ? plotW / n : plotW;
  const barW = Math.min(24, Math.max(3, band - 2));
  const maxIndex = stats.series.reduce((mi, s, i, arr) => (s.value > arr[mi].value ? i : mi), 0);

  const kpi = (label: string, value: string, sub?: string, tone?: "good" | "bad") => (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xl font-black">Finances</h4>
          <p className="text-xs text-white/35">
            Du {new Date(`${from}T12:00:00`).toLocaleDateString("fr-FR")} au{" "}
            {new Date(`${to}T12:00:00`).toLocaleDateString("fr-FR")} · rendez-vous terminés uniquement
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                period === p.id ? "bg-white text-black" : "text-white/50 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpi("Chiffre d'affaires", `${fmt(stats.revenue)} DT`, `${stats.completedCount} RDV terminés · panier ${fmt(stats.avgTicket)} DT`)}
        {kpi("Parts coiffeurs & produits", `${fmt(stats.productCost + stats.commissions)} DT`, `parts coiffeurs ${fmt(stats.commissions)} · produits ${fmt(stats.productCost)}`)}
        {kpi("Dépenses", `${fmt(stats.expensesTotal)} DT`, `${stats.periodExpenses.length} dépense${stats.periodExpenses.length > 1 ? "s" : ""} sur la période`)}
        {kpi(
          "Bénéfice du salon",
          `${fmt(stats.net)} DT`,
          stats.revenue > 0 ? `${stats.marginPct.toFixed(0)} % du chiffre d'affaires` : "aucun RDV terminé",
          stats.net > 0 ? "good" : stats.net < 0 ? "bad" : undefined
        )}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold">
            Chiffre d&apos;affaires {stats.weekly ? "par semaine" : "par jour"}
          </p>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            {showTable ? "Graphique" : "Tableau"}
          </button>
        </div>

        {showTable ? (
          <div className="max-h-72 overflow-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#111] text-[11px] uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{stats.weekly ? "Semaine du" : "Jour"}</th>
                  <th className="px-3 py-2 text-right font-semibold">CA (DT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {stats.series.map((s) => (
                  <tr key={s.date}>
                    <td className="px-3 py-1.5">{new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmt(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full min-w-[520px]" role="img" aria-label="Chiffre d'affaires par période">
              {ticks.map((tick) => {
                const y = PAD_T + plotH - (tick / niceMax) * plotH;
                return (
                  <g key={tick}>
                    <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                    <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.4)">
                      {fmt(tick)}
                    </text>
                  </g>
                );
              })}

              {stats.series.map((s, i) => {
                const h = (s.value / niceMax) * plotH;
                const x = PAD_L + i * band + (band - barW) / 2;
                const y = PAD_T + plotH - h;
                const r = Math.min(4, barW / 2, h);
                const path =
                  h <= 0
                    ? ""
                    : `M${x},${PAD_T + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${PAD_T + plotH} Z`;
                const active = hover === i;
                const showLabel = (i === maxIndex && s.value > 0) || active;
                const dateLabel = new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

                return (
                  <g key={s.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                    {/* zone de survol plus large que la barre */}
                    <rect x={PAD_L + i * band} y={PAD_T} width={band} height={plotH} fill="transparent" />
                    {path && <path d={path} fill={BAR_COLOR} opacity={hover === null || active ? 1 : 0.55} />}
                    {showLabel && (
                      <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="rgba(255,255,255,0.85)">
                        {fmt(s.value)}
                      </text>
                    )}
                    {(n <= 14 || i % Math.ceil(n / 12) === 0) && (
                      <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)">
                        {stats.weekly || n > 14
                          ? new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                          : new Date(`${s.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}
                      </text>
                    )}
                    <title>{`${dateLabel} : ${fmt(s.value)} DT`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Per barber */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <p className="text-sm font-bold">Par coiffeur</p>
            <p className="text-xs text-white/35">
              Part coiffeur = ce que le coiffeur garde · Part salon = ce qui revient au propriétaire (réglable dans Paramètres → Coiffeurs)
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-white/35">
              <tr>
                <th className="px-5 py-2 text-left font-semibold">Coiffeur</th>
                <th className="px-3 py-2 text-right font-semibold">RDV</th>
                <th className="px-3 py-2 text-right font-semibold">CA</th>
                <th className="px-3 py-2 text-right font-semibold">Part coiffeur</th>
                <th className="px-5 py-2 text-right font-semibold">Part salon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {stats.perBarber.map((row) => (
                <tr key={row.barber.id} className={row.barber.active ? "" : "opacity-50"}>
                  <td className="px-5 py-2.5 font-semibold">
                    {row.barber.name}
                    {row.barber.is_owner && (
                      <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Propriétaire
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white/60">
                    {row.barber.is_owner ? (
                      <span className="text-white/30">—</span>
                    ) : (
                      <>
                        {fmt(row.commission)} <span className="text-white/30">({row.barber.commission_pct ?? 0} %)</span>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">{fmt(row.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/[0.07] px-5 py-3 text-xs text-white/35">
            Annulations sur la période : {stats.cancelledClient} par les clients · {stats.cancelledSalon} par le salon
          </p>
        </div>

        {/* Expenses */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <p className="text-sm font-bold">Dépenses</p>
            <p className="text-xs text-white/35">Loyer, produits, électricité… déduites de la marge</p>
          </div>

          <form onSubmit={addExpense} className="grid gap-2 border-b border-white/[0.07] p-4 sm:grid-cols-[1fr_auto]">
            <input value={expLabel} onChange={(e) => setExpLabel(e.target.value)} maxLength={80} placeholder="Libellé (ex. Loyer septembre)" className={inputClass} />
            <input type="number" min="0" step="0.5" inputMode="decimal" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="Montant DT" className={`${inputClass} sm:w-32`} />
            <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className={inputClass}>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={`${inputClass} sm:w-40`} />
            <button type="submit" disabled={saving || !expLabel.trim() || !expAmount} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50 sm:col-span-2">
              {saving ? "Ajout..." : "+ Ajouter la dépense"}
            </button>
          </form>

          {stats.periodExpenses.length === 0 ? (
            <p className="px-5 py-4 text-sm text-white/30">Aucune dépense sur la période.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-white/[0.05] overflow-auto">
              {stats.periodExpenses.map((exp) => (
                <li key={exp.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{exp.label}</p>
                    <p className="text-xs text-white/35">
                      {CATEGORIES[exp.category] ?? exp.category} · {new Date(`${exp.expense_date}T12:00:00`).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold tabular-nums">{fmt(exp.amount)} DT</span>
                    <button type="button" onClick={() => removeExpense(exp)} className="text-xs text-red-400/70 hover:text-red-400">✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

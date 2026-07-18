import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, Field, EmptyState, Badge, SkeletonCard, StatCard } from "../components/Shared";
import { Wallet, Plus, Trash, TrendUp, TrendDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORIES = ["seeds", "fertilizer", "crop_protection", "labor", "machinery", "transport", "irrigation", "rent", "storage", "misc"];
const COLORS = ["#0F3821", "#D69F39", "#C85A32", "#8A9A5B", "#457B9D", "#2D6A4F", "#E9C46A", "#7C8D81", "#4A5D51", "#a3b18a"];

export default function Expenses() {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => {
    api.get("/expenses").then(({ data }) => setItems(data)).catch(() => setItems([]));
    api.get("/expenses/summary").then(({ data }) => setSummary(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses", form);
      toast.success(t("save")); setForm(null); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const pieData = summary ? Object.entries(summary.by_category).map(([k, v]) => ({ name: k, value: v })) : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("expenses")}
        action={
          <div className="flex gap-2">
            <button onClick={() => setForm({ kind: "expense", category: "seeds" })} className={btnPrimary} data-testid="expense-add-btn"><Plus size={16} />{t("add_expense")}</button>
            <button onClick={() => setForm({ kind: "revenue", category: "misc" })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D69F39] text-[#0A170F] text-sm font-medium hover:bg-[#e5b355] transition-colors" data-testid="revenue-add-btn"><Plus size={16} />{t("add_revenue")}</button>
          </div>
        } />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={TrendDown} label={t("total_expense")} value={`₹${summary.total_expense.toLocaleString("en-IN")}`} tone="cream" testId="expense-total" />
          <StatCard icon={TrendUp} label={t("total_revenue")} value={`₹${summary.total_revenue.toLocaleString("en-IN")}`} tone="gold" testId="revenue-total" />
          <StatCard icon={Wallet} label={t("profit_loss")} value={`₹${summary.profit.toLocaleString("en-IN")}`} tone={summary.profit >= 0 ? "green" : "terra"} testId="profit-total" />
        </div>
      )}

      {form && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-[#0F3821]/10 p-6 grid sm:grid-cols-4 gap-3 items-end fade-up" data-testid="expense-form">
          <Field label={t("category")}>
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="expense-category-select">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label={`${t("amount")} (₹)`}><input required type="number" min="1" className={inputCls} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} data-testid="expense-amount-input" /></Field>
          <Field label={t("date")}><input required type="date" className={inputCls} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="expense-date-input" /></Field>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} data-testid="expense-save-btn">{t("save")}</button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-[#7C8D81] px-2" data-testid="expense-cancel-btn">{t("cancel")}</button>
          </div>
        </form>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {pieData.length > 0 && (
          <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="expense-chart">
            <h2 className="font-heading font-semibold text-lg mb-2">{t("category")}</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((p, i) => (
                <span key={p.name} className="text-xs flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name.replace("_", " ")}</span>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="expense-list">
          <h2 className="font-heading font-semibold text-lg mb-3">{t("expenses")}</h2>
          {items === null ? <SkeletonCard /> : items.length === 0 ? (
            <EmptyState icon={Wallet} title={t("no_data")} subtitle="Record your first expense to see crop-wise cost and profitability." />
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {items.map((e) => (
                <li key={e.id} className="flex justify-between items-center p-3 rounded-lg bg-[#F9F6F0]" data-testid={`expense-item-${e.id}`}>
                  <div>
                    <p className="font-medium text-sm capitalize">{e.category.replace("_", " ")}</p>
                    <p className="text-xs text-[#7C8D81]">{e.date}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={e.kind === "revenue" ? "gold" : "gray"}>{e.kind === "revenue" ? "+" : "−"}₹{e.amount.toLocaleString("en-IN")}</Badge>
                    <button onClick={async () => { await api.delete(`/expenses/${e.id}`); load(); }} className="text-[#7C8D81] hover:text-[#E63946]" data-testid={`expense-delete-${e.id}`} aria-label={t("delete")}><Trash size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, EmptyState } from "../components/Shared";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function SearchPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (q.length < 2) return;
    setBusy(true);
    try { const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`); setResults(data); }
    catch { setResults({}); }
    finally { setBusy(false); }
  };

  const Section = ({ title, items, render }) => items?.length > 0 && (
    <section className="bg-white rounded-xl border border-[#0F3821]/10 p-5">
      <h2 className="font-heading font-semibold mb-3">{title}</h2>
      <ul className="space-y-2 text-sm">{items.map(render)}</ul>
    </section>
  );

  const empty = results && Object.values(results).every((v) => !v || v.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("search")} />
      <form onSubmit={search} className="flex gap-2">
        <input autoFocus className={inputCls} placeholder="tomato, PM-KISAN, seeds vendor..." value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-input" />
        <button type="submit" disabled={busy} className={btnPrimary} data-testid="search-submit-btn"><MagnifyingGlass size={16} />{t("search")}</button>
      </form>
      {empty && <EmptyState icon={MagnifyingGlass} title={t("no_data")} subtitle={`No results for "${q}" across crops, vendors, demand, listings, schemes and FAQs.`} />}
      {results && !empty && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={t("commodity")} items={results.commodities} render={(c) => <li key={c.key}><Link className="text-[#0F3821] hover:underline" to="/demand" data-testid={`search-commodity-${c.key}`}>{c.name}</Link></li>} />
          <Section title={t("schemes")} items={results.schemes} render={(s) => <li key={s.id}><Link className="text-[#0F3821] hover:underline" to="/schemes">{s.name}</Link><p className="text-xs text-[#7C8D81]">{s.summary}</p></li>} />
          <Section title={t("krishi_market")} items={results.listings} render={(l) => <li key={l.id}><Link className="text-[#0F3821] hover:underline" to="/market">{l.title}</Link></li>} />
          <Section title={t("demand_supply")} items={results.demand} render={(d) => <li key={d.id}><Link className="text-[#0F3821] hover:underline" to="/demand">{d.commodity} · {d.quantity} {d.unit}</Link></li>} />
          <Section title={t("vendors")} items={results.vendors} render={(v) => <li key={v.id}><Link className="text-[#0F3821] hover:underline" to="/vendors">{v.business_name}</Link></li>} />
          <Section title={t("faqs")} items={results.faqs} render={(f) => <li key={f.id}><Link className="text-[#0F3821] hover:underline" to="/help">{f.q}</Link></li>} />
        </div>
      )}
    </div>
  );
}

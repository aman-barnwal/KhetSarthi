import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, EmptyState, Badge, SkeletonCard } from "../components/Shared";
import { Bank, ArrowSquareOut, CaretDown, CaretUp } from "@phosphor-icons/react";

const CATS = ["income_support", "insurance", "credit", "advisory", "infrastructure", "market", "organic", "irrigation", "production"];

export default function Schemes() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const loc = (s, field) => (lang === "hi" && s.hi && s.hi[field]) || s[field];

  useEffect(() => {
    setData(null);
    api.get(`/schemes${cat ? `?category=${cat}` : ""}`).then(({ data }) => setData(data)).catch(() => setData({ schemes: [] }));
  }, [cat]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("schemes")} subtitle="Verified central schemes with official links. Always confirm deadlines and eligibility on the official portal before applying." />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCat("")} className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${!cat ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`} data-testid="schemes-cat-all">All</button>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} data-testid={`schemes-cat-${c}`}
            className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${cat === c ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`}>
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {data === null ? <SkeletonCard lines={5} /> : data.schemes.length === 0 ? (
        <EmptyState icon={Bank} title={t("no_data")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.schemes.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl border border-[#0F3821]/10 overflow-hidden card-lift ${open === s.id ? "sm:col-span-2" : ""}`} data-testid={`scheme-${s.id}`}>
              {s.image && (
                <div className="relative h-36 overflow-hidden">
                  <img src={s.image} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-3"><Badge tone="gold">{s.category.replace(/_/g, " ")}</Badge></span>
                </div>
              )}
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="w-full text-left p-5 flex justify-between items-start gap-3" data-testid={`scheme-toggle-${s.id}`}>
                <div>
                  <h3 className="font-heading font-semibold">{s.name}</h3>
                  <p className="text-sm text-[#4A5D51] mt-1.5">{loc(s, "summary")}</p>
                </div>
                {open === s.id ? <CaretUp size={18} className="shrink-0 mt-1" /> : <CaretDown size={18} className="shrink-0 mt-1" />}
              </button>
              {open === s.id && (
                <div className="px-5 pb-5 space-y-3 text-sm fade-up" data-testid={`scheme-details-${s.id}`}>
                  <p><strong>{t("benefits")}:</strong> {loc(s, "benefits")}</p>
                  <p><strong>{t("eligibility")}:</strong> {loc(s, "eligibility")}</p>
                  <p><strong>{t("documents")}:</strong> {s.documents.join(", ")}</p>
                  <p><strong>{t("apply")}:</strong> {loc(s, "how_to_apply")}</p>
                  <a href={s.official_link} target="_blank" rel="noopener noreferrer" data-testid={`scheme-link-${s.id}`}
                    className="inline-flex items-center gap-1.5 text-[#C85A32] font-medium hover:underline">
                    {t("official_site")} <ArrowSquareOut size={14} />
                  </a>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-[#7C8D81] sm:col-span-2">{t("source")}: {data.source}</p>
        </div>
      )}
    </div>
  );
}

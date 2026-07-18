import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, inputCls, EmptyState } from "../components/Shared";
import { Question, CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";

const TOPICS = ["getting_started", "account", "language", "voice", "weather", "crop_scan", "prices", "demand_supply", "marketplace", "vendors", "schemes", "expenses", "privacy", "support"];

export default function Help() {
  const { t } = useI18n();
  const [faqs, setFaqs] = useState([]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (topic) params.set("topic", topic);
    api.get(`/faqs?${params}`).then(({ data }) => setFaqs(data)).catch(() => setFaqs([]));
  }, [q, topic]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("help")} subtitle={t("faqs")} />
      <input className={inputCls} placeholder={`${t("search")}...`} value={q} onChange={(e) => setQ(e.target.value)} data-testid="help-search-input" />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTopic("")} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${!topic ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`} data-testid="help-topic-all">All</button>
        {TOPICS.map((tp) => (
          <button key={tp} onClick={() => setTopic(tp)} data-testid={`help-topic-${tp}`}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${topic === tp ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`}>
            {tp.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {faqs.length === 0 ? (
        <EmptyState icon={Question} title={t("no_data")}
          action={<Link to="/ai" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F3821] text-white text-sm font-medium" data-testid="help-ask-ai-btn"><Sparkle size={16} />{t("ask_krishi_ai")}</Link>} />
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-[#0F3821]/10" data-testid={`faq-${f.id}`}>
              <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full flex justify-between items-center text-left p-4" data-testid={`faq-toggle-${f.id}`}>
                <span className="font-medium text-sm">{f.q}</span>
                {open === f.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </button>
              {open === f.id && <p className="px-4 pb-4 text-sm text-[#4A5D51] leading-relaxed fade-up">{f.a}</p>}
            </div>
          ))}
          <div className="bg-[#0F3821] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#F9F6F0]">Didn't find your answer?</p>
            <Link to="/ai" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D69F39] text-[#0A170F] text-sm font-semibold" data-testid="help-ask-ai-cta"><Sparkle size={16} />{t("ask_krishi_ai")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

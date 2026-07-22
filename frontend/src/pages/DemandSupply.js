import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, btnSecondary, Field, EmptyState, Badge, SkeletonCard } from "../components/Shared";
import { Handshake, Plus, Plant, Carrot, Orange, GrainsSlash, Grains, Pepper, Package, X } from "@phosphor-icons/react";
import { toast } from "sonner";

const CAT_ICONS = { vegetables: Carrot, fruits: Orange, grains: Grains, pulses: GrainsSlash, spices: Pepper, oilseeds: Plant, other: Package };

const UNIT_LABELS = {
  quintal: { en: "Quintal", hi: "क्विंटल" },
  kg: { en: "kg", hi: "किलोग्राम" },
  tonne: { en: "Tonne", hi: "टन" },
  crate: { en: "Crate", hi: "क्रेट" },
  dozen: { en: "Dozen", hi: "दर्जन" },
};

const unitName = (unit, lang) => {
  return UNIT_LABELS[unit]?.[lang === "hi" ? "hi" : "en"] || unit;
};

const cname = (commodity, lang) => {
  if (!commodity) return "";

  if (lang === "hi") {
    return commodity.name_hi ||
           commodity.name ||
           commodity.name_en ||
           commodity.key ||
           "";
  }

  return commodity.name ||
         commodity.name_en ||
         commodity.key ||
         "";
};

const dispName = (commodity, lang, commodities = []) => {
  if (!commodity) return "";

  // API demand/harvest records may contain only a string commodity name
  if (typeof commodity === "string") {
    if (lang === "hi") {
      const normalized = commodity.toLowerCase().trim();

      const match = commodities.find((c) => {
        const english = (c.name || "").toLowerCase().trim();
        const key = (c.key || "").toLowerCase().trim();

        return (
          english === normalized ||
          key === normalized ||
          english.split(" ")[0] === normalized
        );
      });

      return match?.name_hi || commodity;
    }

    return commodity;
  }

  return cname(commodity, lang);
};

export default function DemandSupply() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [commodities, setCommodities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [demand, setDemand] = useState(null);
  const [harvests, setHarvests] = useState(null);
  const [modal, setModal] = useState(null); // 'demand' | 'harvest' | {enquiry: post}
  const [form, setForm] = useState({});
  const isVendor = user.role === "vendor";

  useEffect(() => { api.get("/commodities").then(({ data }) => setCommodities(data)).catch(() => {}); }, []);

  const loadCommodity = async (c) => {
    setSelected(c); setDemand(null); setHarvests(null);
    try {
      const [d, h] = await Promise.all([
        api.get(`/demand?commodity=${encodeURIComponent(c.name.split(" ")[0])}`),
        api.get(`/harvests?commodity=${encodeURIComponent(c.name.split(" ")[0])}`),
      ]);
      setDemand(d.data); setHarvests(h.data);
    } catch { setDemand([]); setHarvests([]); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (modal === "demand") { await api.post("/demand", form); toast.success(t("post_demand")); }
      else if (modal === "harvest") { await api.post("/harvests", form); toast.success(t("declare_harvest")); }
      else if (modal?.enquiry) { await api.post("/enquiries", { demand_id: modal.enquiry.id, message: form.message }); toast.success(t("send_enquiry")); }
      setModal(null); setForm({});
      if (selected) loadCommodity(selected);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const categories = ["vegetables", "fruits", "grains", "pulses", "spices", "oilseeds", "other"];

  return (
    <div className="space-y-6">
      <PageHeader
  title={t("demand_supply")}
  subtitle={
    lang === "hi"
      ? "फसल कटाई से पहले मांग — उपज खराब होने से पहले किसानों और खरीदारों को जोड़ें।"
      : "Demand Before Harvest — match buyers and farmers before produce becomes perishable."
  }
        action={
          <div className="flex gap-2">
            {isVendor && <button onClick={() => { setModal("demand"); setForm({ commodity: selected?.name || "", unit: "quintal" }); }} className={btnPrimary} data-testid="post-demand-btn"><Plus size={16} />{t("post_demand")}</button>}
            {user.role === "farmer" && <button onClick={() => { setModal("harvest"); setForm({ commodity: selected?.name || "", unit: "quintal" }); }} className={btnPrimary} data-testid="declare-harvest-btn"><Plus size={16} />{t("declare_harvest")}</button>}
          </div>
        } />

      {!selected && categories.map((cat) => {
        const items = commodities.filter((c) => c.category === cat);
        if (!items.length) return null;
        const Icon = CAT_ICONS[cat];
        return (
          <section key={cat}>
            <h2 className="font-heading font-semibold text-lg flex items-center gap-2 mb-3"><Icon size={20} weight="duotone" className="text-[#C85A32]" />{t(cat)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((c) => (
                <button key={c.key} onClick={() => loadCommodity(c)} data-testid={`commodity-${c.key}`}
                  className="bg-white rounded-xl border border-[#0F3821]/10 p-4 text-left card-lift">
                  <p className="font-medium text-sm">{cname(c, lang)}</p>
                  <p className="text-xs text-[#7C8D81]">{t(c.category)}</p>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {selected && (
        <div className="space-y-5 fade-up">
          <button onClick={() => setSelected(null)} className={btnSecondary} data-testid="commodity-back-btn">← {t("back")}</button>
          <h2 className="font-heading text-xl font-bold">
  {cname(selected, lang)} — {t("who_needs")}
</h2>
          {demand === null ? <SkeletonCard /> : demand.length === 0 ? (
            <EmptyState icon={Handshake} title={t("no_data")} subtitle={t("no_demand_empty")}
              action={user.role === "farmer" ? <button onClick={() => { setModal("harvest"); setForm({ commodity: selected.name, unit: "quintal" }); }} className={btnPrimary} data-testid="empty-declare-harvest-btn">{t("declare_harvest")}</button> : null} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {demand.map((d) => (
                <div key={d.id} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 card-lift" data-testid={`demand-card-${d.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-heading font-semibold">{d.quantity} {unitName(d.unit, lang)} · {dispName(d.commodity, lang, commodities)}</p>
                      <p className="text-xs text-[#7C8D81] mt-0.5">{d.poster_name}{d.district ? ` · ${d.district}` : ""}{d.state ? `, ${d.state}` : ""}</p>
                    </div>
                    {d.offered_price && <Badge tone="gold">
  ₹{d.offered_price}/{unitName(d.unit, lang)}
</Badge>}
                  </div>
                  <div className="text-xs text-[#4A5D51] mt-3 space-y-0.5">
                    {d.required_by && <p>{t("required_by")}: {d.required_by}</p>}
                    {d.quality_grade && (
  <p>{lang === "hi" ? "ग्रेड" : "Grade"}: {d.quality_grade}</p>
)}
                    {d.notes && <p className="text-[#7C8D81]">{d.notes}</p>}
                  </div>
                  {user.role === "farmer" && (
                    <button onClick={() => { setModal({ enquiry: d }); setForm({}); }} className={`${btnPrimary} mt-4 w-full`} data-testid={`demand-respond-${d.id}`}>{t("respond")}</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <h2 className="font-heading text-xl font-bold pt-2">{t("expected_harvest")}</h2>
          {harvests === null ? <SkeletonCard /> : harvests.length === 0 ? (
            <p className="text-sm text-[#7C8D81]">
  {lang === "hi"
    ? `${cname(selected, lang)} के लिए अभी तक कोई अपेक्षित फसल घोषित नहीं की गई है।`
    : `No expected harvests declared for ${cname(selected, lang)} yet.`}
</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {harvests.map((h) => (
                <div key={h.id} className="bg-white rounded-xl border border-[#0F3821]/10 p-5" data-testid={`harvest-card-${h.id}`}>
                  <p className="font-heading font-semibold">{h.expected_quantity} {unitName(h.unit, lang)} · {dispName(h.commodity, lang, commodities)}</p>
                  <p className="text-xs text-[#7C8D81] mt-0.5">{h.farmer_name}{h.district ? ` · ${h.district}` : ""}</p>
                  {h.harvest_window_start && <p className="text-xs text-[#4A5D51] mt-2">{t("harvest_window")}: {h.harvest_window_start} → {h.harvest_window_end || "?"}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} data-testid="demand-modal"
            className="relative bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-lg">{modal === "demand" ? t("post_demand") : modal === "harvest" ? t("declare_harvest") : t("send_enquiry")}</h3>
              <button type="button" onClick={() => setModal(null)} data-testid="demand-modal-close"><X size={20} /></button>
            </div>
            {modal?.enquiry ? (
              <Field label={t("note")}>
                <textarea required className={inputCls} rows={3} placeholder={
  lang === "hi"
    ? "मैं इसकी आपूर्ति कर सकता/सकती हूँ। मेरी अपेक्षित मात्रा और कीमत..."
    : "I can supply this. My expected quantity and price..."
} onChange={(e) => setForm({ message: e.target.value })} data-testid="enquiry-message-input" />
              </Field>
            ) : (
              <>
                <Field label={t("commodity")}>
                  <input required className={inputCls} value={form.commodity || ""} onChange={(e) => setForm({ ...form, commodity: e.target.value })} data-testid="modal-commodity-input" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("quantity")}>
                    <input required type="number" min="0.1" step="0.1" className={inputCls}
                      onChange={(e) => setForm({ ...form, [modal === "demand" ? "quantity" : "expected_quantity"]: parseFloat(e.target.value) })} data-testid="modal-quantity-input" />
                  </Field>
                  <Field label={t("unit")}>
                    <select
  className={inputCls}
  value={form.unit}
  onChange={(e) => setForm({ ...form, unit: e.target.value })}
  data-testid="modal-unit-select"
>
  {["quintal", "kg", "tonne", "crate", "dozen"].map((u) => (
    <option key={u} value={u}>
      {unitName(u, lang)}
    </option>
  ))}
</select>
                  </Field>
                </div>
                {modal === "demand" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("required_by")}><input type="date" className={inputCls} onChange={(e) => setForm({ ...form, required_by: e.target.value })} data-testid="modal-requiredby-input" /></Field>
                    <Field label={`${t("offered_price")} (₹)`}><input type="number" className={inputCls} onChange={(e) => setForm({ ...form, offered_price: parseFloat(e.target.value) || null })} data-testid="modal-price-input" /></Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`${t("harvest_window")} ${lang === "hi" ? "(से)" : "(from)"}`}><input type="date" className={inputCls} onChange={(e) => setForm({ ...form, harvest_window_start: e.target.value })} data-testid="modal-window-start" /></Field>
                    <Field label={lang === "hi" ? "(तक)" : "(to)"}><input type="date" className={inputCls} onChange={(e) => setForm({ ...form, harvest_window_end: e.target.value })} data-testid="modal-window-end" /></Field>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("district")}><input className={inputCls} onChange={(e) => setForm({ ...form, district: e.target.value })} data-testid="modal-district-input" /></Field>
                  <Field label={t("state")}><input className={inputCls} onChange={(e) => setForm({ ...form, state: e.target.value })} data-testid="modal-state-input" /></Field>
                </div>
              </>
            )}
            <button type="submit" className={`${btnPrimary} w-full py-3`} data-testid="demand-modal-submit">{t("submit")}</button>
          </form>
        </div>
      )}
    </div>
  );
}

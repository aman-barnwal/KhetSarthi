import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, Field, EmptyState, Badge, SkeletonCard } from "../components/Shared";
import { Storefront, Plus, X, Package, ChatCircleText, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATES = ["new", "accepted", "preparing", "ready", "dispatched", "delivered", "cancelled", "disputed"];
const STATE_TONE = { new: "blue", accepted: "green", preparing: "gold", ready: "gold", dispatched: "blue", delivered: "green", cancelled: "red", disputed: "red" };

export default function Market() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isFarmer = user.role === "farmer";
  const [tab, setTab] = useState("browse"); // browse | inputs | mine | enquiries
  const [listings, setListings] = useState(null);
  const [enquiries, setEnquiries] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    setListings(null);
    try {
      let url = "/listings?";
      if (tab === "browse") url += "listing_type=produce";
      else if (tab === "inputs") url += "listing_type=input";
      else if (tab === "mine") url += "mine=true";
      if (tab === "enquiries") {
        const [inbox, sent] = await Promise.all([api.get("/enquiries?box=inbox"), api.get("/enquiries?box=sent")]);
        setEnquiries({ inbox: inbox.data, sent: sent.data });
      } else {
        const { data } = await api.get(url);
        setListings(data);
      }
    } catch { setListings([]); setEnquiries({ inbox: [], sent: [] }); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const createListing = async (e) => {
    e.preventDefault();
    try {
      await api.post("/listings", { ...form, listing_type: isFarmer ? "produce" : "input" });
      toast.success(t("save")); setModal(null); setForm({}); setTab("mine");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const enquire = async (e) => {
    e.preventDefault();
    try {
      await api.post("/enquiries", { listing_id: modal.listing.id, message: form.message });
      toast.success(t("send_enquiry")); setModal(null); setForm({});
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const setStatus = async (eid, status) => {
    try { await api.patch(`/enquiries/${eid}`, { status }); load(); } catch (err) { toast.error(formatApiError(err)); }
  };

  const tabs = [
    { key: "browse", label: t("krishi_market") },
    { key: "inputs", label: "Inputs & Services" },
    { key: "mine", label: t("my_listings") },
    { key: "enquiries", label: t("enquiries") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("krishi_market")} subtitle="Local market connectivity — produce, inputs and services with enquiry-based deals."
        action={<button onClick={() => { setModal("create"); setForm({ unit: "quintal" }); }} className={btnPrimary} data-testid="market-add-listing-btn"><Plus size={16} />{isFarmer ? t("sell_produce") : "List input/service"}</button>} />
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} data-testid={`market-tab-${tb.key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === tb.key ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab !== "enquiries" && (listings === null ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div> :
        listings.length === 0 ? (
          <EmptyState icon={Storefront} title={t("no_data")} subtitle={tab === "mine" ? "Create your first listing to reach buyers and farmers." : "No active listings in this category yet. Check back soon or create an alert."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-xl border border-[#0F3821]/10 overflow-hidden card-lift" data-testid={`listing-card-${l.id}`}>
                {l.image_base64 ? <img src={`data:image/jpeg;base64,${l.image_base64}`} alt={l.title} className="w-full h-36 object-cover" /> :
                  <div className="w-full h-24 bg-[#F0EBE1] flex items-center justify-center"><Package size={32} weight="duotone" className="text-[#8A9A5B]" /></div>}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-heading font-semibold text-sm">{l.title}</h3>
                    {l.seller_verified && <Badge tone="green">{t("verified")}</Badge>}
                  </div>
                  <p className="text-xs text-[#7C8D81]">{l.seller_name}{l.district ? ` · ${l.district}` : ""}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {l.price && <Badge tone="gold">₹{l.price} {l.price_unit}</Badge>}
                    {l.quantity && <Badge tone="gray">{l.quantity} {l.unit}</Badge>}
                    <Badge tone={l.status === "active" ? "blue" : "gray"}>{l.status}</Badge>
                  </div>
                  {l.description && <p className="text-xs text-[#4A5D51] line-clamp-2">{l.description}</p>}
                  {tab !== "mine" && l.user_id !== user.id && (
                    <button onClick={() => { setModal({ listing: l }); setForm({}); }} className={`${btnPrimary} w-full mt-1`} data-testid={`listing-enquire-${l.id}`}>
                      <ChatCircleText size={16} />{t("send_enquiry")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "enquiries" && (enquiries === null ? <SkeletonCard /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {[["inbox", "Received"], ["sent", "Sent"]].map(([box, label]) => (
            <section key={box} className="bg-white rounded-xl border border-[#0F3821]/10 p-6">
              <h2 className="font-heading font-semibold text-lg mb-3">{label}</h2>
              {enquiries[box].length === 0 ? <p className="text-sm text-[#7C8D81]">{t("no_data")}</p> : (
                <ul className="space-y-3">
                  {enquiries[box].map((e) => (
                    <li key={e.id} className="p-3 rounded-lg bg-[#F9F6F0]" data-testid={`enquiry-${e.id}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-sm">{e.subject}</p>
                          <p className="text-xs text-[#7C8D81]">{box === "inbox" ? `From: ${e.from_name}` : ""} · {e.created_at?.slice(0, 10)}</p>
                          <p className="text-sm text-[#4A5D51] mt-1">{e.message}</p>
                        </div>
                        <Badge tone={STATE_TONE[e.status] || "gray"}>{e.status}</Badge>
                      </div>
                      {box === "inbox" && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {STATES.filter((s) => s !== e.status && s !== "new").slice(0, 4).map((s) => (
                            <button key={s} onClick={() => setStatus(e.id, s)} data-testid={`enquiry-status-${e.id}-${s}`}
                              className="px-2.5 py-1 rounded-full text-xs bg-white border border-[#0F3821]/15 hover:border-[#0F3821] transition-colors">
                              <CheckCircle size={11} className="inline mr-1" />{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          {modal === "create" ? (
            <form onSubmit={createListing} onClick={(e) => e.stopPropagation()} data-testid="market-create-modal"
              className="relative bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-lg">{isFarmer ? t("sell_produce") : "List input / service"}</h3>
                <button type="button" onClick={() => setModal(null)} data-testid="market-modal-close"><X size={20} /></button>
              </div>
              <Field label="Title"><input required className={inputCls} placeholder={isFarmer ? "e.g. Fresh Tomato — Grade A" : "e.g. Hybrid Tomato Seeds 10g"} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="listing-title-input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={isFarmer ? t("commodity") : t("category")}>
                  <input className={inputCls} onChange={(e) => setForm({ ...form, [isFarmer ? "commodity" : "category"]: e.target.value })} data-testid="listing-commodity-input" />
                </Field>
                <Field label={`${t("price")} (₹)`}><input type="number" className={inputCls} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || null })} data-testid="listing-price-input" /></Field>
                <Field label={t("quantity")}><input type="number" className={inputCls} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || null })} data-testid="listing-quantity-input" /></Field>
                <Field label={t("unit")}>
                  <select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} data-testid="listing-unit-select">
                    {["quintal", "kg", "tonne", "packet", "litre", "unit", "hour", "day"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label={t("district")}><input className={inputCls} onChange={(e) => setForm({ ...form, district: e.target.value })} data-testid="listing-district-input" /></Field>
                <Field label={t("state")}><input className={inputCls} onChange={(e) => setForm({ ...form, state: e.target.value })} data-testid="listing-state-input" /></Field>
              </div>
              <Field label={t("note")}><textarea className={inputCls} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="listing-desc-input" /></Field>
              <button type="submit" className={`${btnPrimary} w-full py-3`} data-testid="listing-submit-btn">{t("submit")}</button>
            </form>
          ) : (
            <form onSubmit={enquire} onClick={(e) => e.stopPropagation()} data-testid="market-enquiry-modal"
              className="relative bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-lg">{t("send_enquiry")}</h3>
                <button type="button" onClick={() => setModal(null)}><X size={20} /></button>
              </div>
              <p className="text-sm text-[#4A5D51]">{modal.listing.title} — {modal.listing.seller_name}</p>
              <Field label={t("note")}>
                <textarea required className={inputCls} rows={3} placeholder="I am interested. Please share availability and final price." onChange={(e) => setForm({ message: e.target.value })} data-testid="enquiry-msg-input" />
              </Field>
              <button type="submit" className={`${btnPrimary} w-full py-3`} data-testid="enquiry-submit-btn">{t("submit")}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

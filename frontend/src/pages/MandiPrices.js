import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, EmptyState, SkeletonCard, Badge } from "../components/Shared";
import { ChartLineUp, BellRinging, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const INDIAN_STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

export default function MandiPrices() {
  const { t } = useI18n();
  const [state, setState] = useState("");
  const [commodity, setCommodity] = useState("");
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [refPrices, setRefPrices] = useState([]);
  const [alertForm, setAlertForm] = useState(null);

  const load = async () => {
    setData(null);
    try {
      const params = new URLSearchParams({ limit: 60 });
      if (state) params.set("state", state);
      if (commodity) params.set("commodity", commodity);
      const { data } = await api.get(`/prices?${params}`);
      setData(data);
    } catch { setData({ available: false, records: [] }); }
  };
  useEffect(() => {
    load();
    api.get("/price-alerts").then(({ data }) => setAlerts(data)).catch(() => {});
    api.get("/managed-prices").then(({ data }) => setRefPrices(data)).catch(() => {});
    /* eslint-disable-next-line */ }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    try {
      const { data: a } = await api.post("/price-alerts", alertForm);
      setAlerts((x) => [...x, a]); setAlertForm(null);
      toast.success("Price alert saved");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("mandi_prices")} subtitle="Official daily prices from Agmarknet (data.gov.in). Transport cost and quality may affect your real selling outcome."
        action={<button onClick={() => setAlertForm({ commodity: commodity || "", threshold: "", direction: "above" })} className={btnPrimary} data-testid="prices-alert-btn"><BellRinging size={16} />Alert</button>} />

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap gap-2">
        <select className={inputCls + " max-w-[220px]"} value={state} onChange={(e) => setState(e.target.value)} data-testid="prices-state-select">
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className={inputCls + " max-w-[220px]"} placeholder={`${t("commodity")} e.g. Tomato`} value={commodity} onChange={(e) => setCommodity(e.target.value)} data-testid="prices-commodity-input" />
        <button type="submit" className={btnPrimary} data-testid="prices-search-btn">{t("search")}</button>
      </form>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="price-alerts-list">
          {alerts.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D69F39]/15 text-[#8a6516] text-sm">
              {a.commodity} {a.direction} ₹{a.threshold}
              <button onClick={async () => { await api.delete(`/price-alerts/${a.id}`); setAlerts((x) => x.filter((y) => y.id !== a.id)); }} data-testid={`alert-delete-${a.id}`} aria-label={t("delete")}><Trash size={13} /></button>
            </span>
          ))}
        </div>
      )}

      {alertForm && (
        <form onSubmit={createAlert} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 flex flex-wrap gap-3 items-end" data-testid="price-alert-form">
          <input required className={inputCls + " max-w-[180px]"} placeholder={t("commodity")} value={alertForm.commodity} onChange={(e) => setAlertForm({ ...alertForm, commodity: e.target.value })} data-testid="alert-commodity-input" />
          <select className={inputCls + " max-w-[120px]"} value={alertForm.direction} onChange={(e) => setAlertForm({ ...alertForm, direction: e.target.value })} data-testid="alert-direction-select">
            <option value="above">above</option><option value="below">below</option>
          </select>
          <input required type="number" className={inputCls + " max-w-[140px]"} placeholder="₹ / quintal" onChange={(e) => setAlertForm({ ...alertForm, threshold: parseFloat(e.target.value) })} data-testid="alert-threshold-input" />
          <button type="submit" className={btnPrimary} data-testid="alert-save-btn">{t("save")}</button>
          <button type="button" onClick={() => setAlertForm(null)} className="text-sm text-[#7C8D81] px-2" data-testid="alert-cancel-btn">{t("cancel")}</button>
        </form>
      )}

      {refPrices.length > 0 && (
        <section className="bg-white rounded-xl border border-[#0F3821]/10 p-5" data-testid="reference-prices">
          <h2 className="font-heading font-semibold mb-1">KhetSarthi reference prices</h2>
          <p className="text-xs text-[#7C8D81] mb-3">Curated by the KhetSarthi team (MSP / market / FPO rates). Separate from live mandi data below.</p>
          <div className="flex flex-wrap gap-2">
            {refPrices.map((p) => (
              <div key={p.id} className="px-3.5 py-2 rounded-lg bg-[#F9F6F0] text-sm" data-testid={`ref-price-${p.id}`}>
                <span className="font-medium capitalize">{p.commodity}</span>
                <span className="text-xs text-[#4A5D51] ml-2">
                  {p.msp != null && <>MSP ₹{p.msp} · </>}{p.market_price != null && <>Mkt ₹{p.market_price} · </>}{p.fpo_price != null && <>FPO ₹{p.fpo_price} · </>}/{p.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data === null ? <SkeletonCard lines={6} /> : !data.available ? (
        <EmptyState icon={ChartLineUp} title={t("market_unavailable")}
          subtitle={data.reason === "not_configured" ? "The market price data source is not configured on the server." : "The official data source did not respond. Please try again shortly."} />
      ) : data.records.length === 0 ? (
        <EmptyState icon={ChartLineUp} title={t("no_data")} subtitle="No records for these filters today. Try a different state or commodity spelling (e.g. 'Tomato')." />
      ) : (
        <div className="bg-white rounded-xl border border-[#0F3821]/10 overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap justify-between items-center gap-2 text-xs text-[#7C8D81] border-b border-[#0F3821]/5">
            <span data-testid="prices-source">{t("source")}: {data.source}</span>
            {data.updated && <span data-testid="prices-updated">{t("last_updated")}: {data.updated}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="prices-table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[#7C8D81] border-b border-[#0F3821]/5">
                  <th className="px-5 py-3">{t("commodity")}</th>
                  <th className="px-5 py-3">{t("market")}</th>
                  <th className="px-5 py-3">{t("district")}/{t("state")}</th>
                  <th className="px-5 py-3 text-right">{t("min_price")} (₹/q)</th>
                  <th className="px-5 py-3 text-right">{t("max_price")}</th>
                  <th className="px-5 py-3 text-right">{t("modal_price")}</th>
                  <th className="px-5 py-3">{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r, i) => (
                  <tr key={i} className="border-b border-[#0F3821]/5 hover:bg-[#F9F6F0] transition-colors" data-testid={`price-row-${i}`}>
                    <td className="px-5 py-3 font-medium">{r.commodity}{r.variety && r.variety !== "Other" ? <span className="text-xs text-[#7C8D81]"> · {r.variety}</span> : ""}</td>
                    <td className="px-5 py-3">{r.market}</td>
                    <td className="px-5 py-3 text-[#4A5D51]">{r.district}, {r.state}</td>
                    <td className="px-5 py-3 text-right">{r.min_price}</td>
                    <td className="px-5 py-3 text-right">{r.max_price}</td>
                    <td className="px-5 py-3 text-right font-semibold"><Badge tone="gold">₹{r.modal_price}</Badge></td>
                    <td className="px-5 py-3 text-[#7C8D81]">{r.arrival_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

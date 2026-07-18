import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { PageHeader, SkeletonCard, Badge, StatCard, inputCls, btnPrimary, Field, EmptyState } from "../components/Shared";
import { UsersThree, Handshake, Storefront, Scan, ShieldCheck, Trash, Plus, X, CaretDown, CaretUp, CurrencyInr } from "@phosphor-icons/react";
import { toast } from "sonner";

const PRICE_FIELDS = [["msp", "MSP"], ["market_price", "Market rate"], ["fpo_price", "FPO rate"]];
const VENDOR_CATEGORIES = ["seeds", "fertilizers", "crop_protection", "equipment", "irrigation", "nursery", "transport", "storage", "produce_buyer", "machinery_services"];

function PricesTab({ t }) {
  const [prices, setPrices] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [edits, setEdits] = useState({});

  const load = () => api.get("/managed-prices").then(({ data }) => setPrices(data)).catch(() => setPrices([]));
  useEffect(() => { load(); }, []);

  const saveRow = async (p) => {
    const patch = edits[p.id];
    if (!patch) return;
    try {
      await api.patch(`/admin/prices/${p.id}`, patch);
      setEdits((e) => { const c = { ...e }; delete c[p.id]; return c; });
      load(); toast.success(t("save"));
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const setEdit = (id, field, value) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value === "" ? null : parseFloat(value) } }));

  const addPrice = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/prices", addForm);
      setAddForm(null); load(); toast.success(t("save"));
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const applyBulk = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/prices/bulk", bulk);
      toast.success(`Updated ${data.updated} items`);
      setBulk(null); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAddForm({ commodity: "", unit: "quintal" })} className={btnPrimary} data-testid="admin-price-add-btn"><Plus size={16} />Add item</button>
        <button onClick={() => setBulk({ field: "market_price", mode: "percent", value: 0 })} data-testid="admin-price-bulk-btn"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#0F3821]/20 bg-white text-sm font-medium hover:bg-[#F0EBE1] transition-colors">
          <CurrencyInr size={16} />Bulk update
        </button>
      </div>
      <p className="text-xs text-[#7C8D81]">Reference prices managed by admin (MSP / market / FPO rates). Shown to users as "KhetSarthi reference prices" — separate from live Agmarknet data.</p>

      {addForm && (
        <form onSubmit={addPrice} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 grid sm:grid-cols-6 gap-3 items-end fade-up" data-testid="admin-price-add-form">
          <Field label={t("commodity")}><input required className={inputCls} onChange={(e) => setAddForm({ ...addForm, commodity: e.target.value })} data-testid="price-commodity-input" /></Field>
          <Field label={t("unit")}>
            <select className={inputCls} value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} data-testid="price-unit-select">
              {["quintal", "kg", "tonne"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          {PRICE_FIELDS.map(([f, label]) => (
            <Field key={f} label={`${label} (₹)`}><input type="number" step="0.01" className={inputCls} onChange={(e) => setAddForm({ ...addForm, [f]: parseFloat(e.target.value) || null })} data-testid={`price-${f}-input`} /></Field>
          ))}
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} data-testid="price-add-save">{t("save")}</button>
            <button type="button" onClick={() => setAddForm(null)} className="text-sm text-[#7C8D81] px-2">{t("cancel")}</button>
          </div>
        </form>
      )}

      {bulk && (
        <form onSubmit={applyBulk} className="bg-[#D69F39]/10 rounded-xl border border-[#D69F39]/40 p-5 flex flex-wrap gap-3 items-end fade-up" data-testid="admin-bulk-form">
          <Field label="Price field">
            <select className={inputCls} value={bulk.field} onChange={(e) => setBulk({ ...bulk, field: e.target.value })} data-testid="bulk-field-select">
              {PRICE_FIELDS.map(([f, l]) => <option key={f} value={f}>{l}</option>)}
            </select>
          </Field>
          <Field label="Mode">
            <select className={inputCls} value={bulk.mode} onChange={(e) => setBulk({ ...bulk, mode: e.target.value })} data-testid="bulk-mode-select">
              <option value="percent">Change by %</option>
              <option value="set">Set value (₹)</option>
            </select>
          </Field>
          <Field label={bulk.mode === "percent" ? "% (e.g. 5 or -3)" : "₹ value"}>
            <input required type="number" step="0.01" className={inputCls} onChange={(e) => setBulk({ ...bulk, value: parseFloat(e.target.value) })} data-testid="bulk-value-input" />
          </Field>
          <button type="submit" className={btnPrimary} data-testid="bulk-apply-btn">Apply to all</button>
          <button type="button" onClick={() => setBulk(null)} className="text-sm text-[#7C8D81] px-2">{t("cancel")}</button>
        </form>
      )}

      {prices === null ? <SkeletonCard lines={5} /> : prices.length === 0 ? (
        <EmptyState icon={CurrencyInr} title={t("no_data")} subtitle="Add commodities with MSP, market and FPO rates. These become the platform's reference price layer." />
      ) : (
        <div className="bg-white rounded-xl border border-[#0F3821]/10 overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-prices-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#7C8D81] border-b border-[#0F3821]/5">
                <th className="px-4 py-3">{t("commodity")}</th><th className="px-4 py-3">{t("unit")}</th>
                {PRICE_FIELDS.map(([f, l]) => <th key={f} className="px-4 py-3">{l} (₹)</th>)}
                <th className="px-4 py-3">Updated</th><th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="border-b border-[#0F3821]/5" data-testid={`admin-price-row-${p.id}`}>
                  <td className="px-4 py-2.5 font-medium capitalize">{p.commodity}</td>
                  <td className="px-4 py-2.5 text-[#7C8D81]">{p.unit}</td>
                  {PRICE_FIELDS.map(([f]) => (
                    <td key={f} className="px-4 py-2.5">
                      <input type="number" step="0.01" defaultValue={p[f] ?? ""} onChange={(e) => setEdit(p.id, f, e.target.value)}
                        className="w-24 px-2 py-1 rounded border border-[#0F3821]/10 focus:border-[#D69F39] outline-none text-sm"
                        data-testid={`price-inline-${p.id}-${f}`} />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-xs text-[#7C8D81]">{p.updated_at?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => saveRow(p)} disabled={!edits[p.id]} data-testid={`price-save-${p.id}`}
                        className="px-2.5 py-1 rounded-full text-xs bg-[#0F3821] text-white disabled:opacity-30">{t("save")}</button>
                      <button onClick={async () => { await api.delete(`/admin/prices/${p.id}`); load(); }} data-testid={`price-delete-${p.id}`}
                        className="text-[#7C8D81] hover:text-[#E63946]" aria-label={t("delete")}><Trash size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorsTab({ t }) {
  const [vendors, setVendors] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [listings, setListings] = useState({});

  const load = () => api.get("/admin/users?role=vendor").then(({ data }) => setVendors(data)).catch(() => setVendors([]));
  useEffect(() => { load(); }, []);

  const addVendor = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/vendors", addForm);
      setAddForm(null); load(); toast.success(t("save"));
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const toggleListings = async (uid) => {
    if (expanded === uid) { setExpanded(null); return; }
    setExpanded(uid);
    if (!listings[uid]) {
      try { const { data } = await api.get(`/admin/vendors/${uid}/listings`); setListings((l) => ({ ...l, [uid]: data })); }
      catch { setListings((l) => ({ ...l, [uid]: [] })); }
    }
  };

  const patchUser = async (id, patch) => {
    try { await api.patch(`/admin/users/${id}`, patch); load(); toast.success(t("save")); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const removeVendor = async (id) => {
    if (!window.confirm("Remove this vendor? Their account is deactivated and listings hidden. History stays visible to admins.")) return;
    try { await api.delete(`/admin/vendors/${id}`); load(); toast.success("Vendor removed (history preserved)"); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-4">
      <button onClick={() => setAddForm({ categories: [], verified: false })} className={btnPrimary} data-testid="admin-vendor-add-btn"><Plus size={16} />Add vendor</button>

      {addForm && (
        <form onSubmit={addVendor} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 space-y-3 fade-up" data-testid="admin-vendor-add-form">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-semibold">New vendor account</h3>
            <button type="button" onClick={() => setAddForm(null)} data-testid="vendor-add-close"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("name")}><input required className={inputCls} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} data-testid="vendor-add-name" /></Field>
            <Field label={t("email")}><input required type="email" className={inputCls} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} data-testid="vendor-add-email" /></Field>
            <Field label={t("password")}><input required minLength={6} className={inputCls} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} data-testid="vendor-add-password" /></Field>
            <Field label={t("business_name")}><input required className={inputCls} onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })} data-testid="vendor-add-business" /></Field>
            <Field label={t("contact")}><input className={inputCls} onChange={(e) => setAddForm({ ...addForm, contact: e.target.value })} data-testid="vendor-add-contact" /></Field>
            <Field label={t("service_area")}><input className={inputCls} onChange={(e) => setAddForm({ ...addForm, service_area: e.target.value })} data-testid="vendor-add-area" /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setAddForm({ ...addForm, categories: toggle(addForm.categories, c) })} data-testid={`vendor-add-cat-${c}`}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${addForm.categories.includes(c) ? "bg-[#C85A32] text-white border-[#C85A32]" : "border-[#0F3821]/15 text-[#4A5D51]"}`}>
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addForm.verified} onChange={(e) => setAddForm({ ...addForm, verified: e.target.checked })} data-testid="vendor-add-verified" />
            Mark as {t("verified")}
          </label>
          <button type="submit" className={btnPrimary} data-testid="vendor-add-save">{t("save")}</button>
        </form>
      )}

      {vendors === null ? <SkeletonCard /> : vendors.length === 0 ? (
        <EmptyState icon={Storefront} title={t("no_data")} subtitle="No vendors yet. Add one above or wait for signups." />
      ) : (
        <div className="space-y-2">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-[#0F3821]/10" data-testid={`admin-vendor-${v.id}`}>
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{v.vendor_profile?.business_name || v.name} <span className="text-xs text-[#7C8D81]">· {v.email}</span></p>
                  <div className="flex gap-1.5 mt-1">
                    {v.verified ? <Badge tone="green">{t("verified")}</Badge> : <Badge tone="gray">{t("unverified")}</Badge>}
                    {!v.active && <Badge tone="red">removed/inactive</Badge>}
                    {(v.vendor_profile?.categories || []).slice(0, 3).map((c) => <Badge key={c} tone="blue">{c.replace(/_/g, " ")}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => toggleListings(v.id)} data-testid={`vendor-listings-${v.id}`}
                    className="px-2.5 py-1 rounded-full text-xs border border-[#0F3821]/15 hover:border-[#0F3821] transition-colors flex items-center gap-1">
                    Listings {expanded === v.id ? <CaretUp size={11} /> : <CaretDown size={11} />}
                  </button>
                  <button onClick={() => patchUser(v.id, { verified: !v.verified })} data-testid={`vendor-verify-${v.id}`}
                    className="px-2.5 py-1 rounded-full text-xs border border-[#0F3821]/15 hover:border-[#0F3821] transition-colors">
                    <ShieldCheck size={11} className="inline mr-1" />{v.verified ? "Unverify" : "Verify"}
                  </button>
                  <button onClick={() => patchUser(v.id, { active: !v.active })} data-testid={`vendor-active-${v.id}`}
                    className="px-2.5 py-1 rounded-full text-xs border border-[#D69F39]/60 text-[#8a6516] hover:bg-[#D69F39]/10 transition-colors">
                    {v.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => removeVendor(v.id)} data-testid={`vendor-remove-${v.id}`}
                    className="px-2.5 py-1 rounded-full text-xs border border-[#E63946]/40 text-[#E63946] hover:bg-[#E63946]/5 transition-colors">
                    <Trash size={11} className="inline mr-1" />Remove
                  </button>
                </div>
              </div>
              {expanded === v.id && (
                <div className="px-4 pb-4 fade-up" data-testid={`vendor-listings-panel-${v.id}`}>
                  {!listings[v.id] ? <SkeletonCard lines={2} /> : listings[v.id].length === 0 ? (
                    <p className="text-sm text-[#7C8D81]">No listings from this vendor.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {listings[v.id].map((l) => (
                        <li key={l.id} className="flex justify-between items-center text-sm p-2.5 rounded-lg bg-[#F9F6F0]">
                          <span>{l.title} {l.price ? `· ₹${l.price}` : ""}</span>
                          <Badge tone={l.status === "active" ? "green" : "gray"}>{l.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [mod, setMod] = useState(null);
  const [tab, setTab] = useState("prices");

  const load = () => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/admin/users").then(({ data }) => setUsers(data)).catch(() => setUsers([]));
    api.get("/admin/moderation").then(({ data }) => setMod(data)).catch(() => setMod({ listings: [], demand: [] }));
  };
  useEffect(() => { load(); }, []);

  const patchUser = async (id, patch) => {
    try { await api.patch(`/admin/users/${id}`, patch); load(); toast.success(t("save")); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const removeContent = async (kind, id) => {
    try { await api.delete(`/admin/content/${kind}/${id}`); load(); toast.success(t("delete")); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin")} subtitle="Prices, vendors, users, verification, moderation and platform analytics." />
      {stats ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={UsersThree} label="Farmers" value={stats.farmers} tone="cream" testId="admin-stat-farmers" />
          <StatCard icon={Storefront} label="Vendors" value={stats.vendors} tone="cream" testId="admin-stat-vendors" />
          <StatCard icon={Handshake} label="Open demand" value={stats.open_demand} tone="gold" testId="admin-stat-demand" />
          <StatCard icon={Scan} label="Crop scans" value={stats.crop_scans} tone="terra" testId="admin-stat-scans" />
        </div>
      ) : <SkeletonCard />}

      <div className="flex gap-2 flex-wrap">
        {["prices", "vendors", "users", "moderation"].map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} data-testid={`admin-tab-${tb}`}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${tab === tb ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`}>
            {tb}
          </button>
        ))}
      </div>

      {tab === "prices" && <PricesTab t={t} />}
      {tab === "vendors" && <VendorsTab t={t} />}

      {tab === "users" && (users === null ? <SkeletonCard /> : (
        <div className="bg-white rounded-xl border border-[#0F3821]/10 overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-users-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#7C8D81] border-b border-[#0F3821]/5">
                <th className="px-4 py-3">{t("name")}</th><th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">Role</th><th className="px-4 py-3">{t("status")}</th><th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#0F3821]/5" data-testid={`admin-user-${u.id}`}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-[#4A5D51]">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{u.role || "—"}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {u.verified && <Badge tone="green">{t("verified")}</Badge>}
                      {!u.active && <Badge tone="red">inactive</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" && (
                      <div className="flex gap-2">
                        <button onClick={() => patchUser(u.id, { verified: !u.verified })} data-testid={`admin-verify-${u.id}`}
                          className="px-2.5 py-1 rounded-full text-xs border border-[#0F3821]/15 hover:border-[#0F3821] transition-colors">
                          <ShieldCheck size={12} className="inline mr-1" />{u.verified ? "Unverify" : "Verify"}
                        </button>
                        <button onClick={() => patchUser(u.id, { active: !u.active })} data-testid={`admin-active-${u.id}`}
                          className="px-2.5 py-1 rounded-full text-xs border border-[#C85A32]/40 text-[#C85A32] hover:bg-[#C85A32]/5 transition-colors">
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === "moderation" && (mod === null ? <SkeletonCard /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {[["listings", "listing", mod.listings, (x) => x.title], ["demand", "demand", mod.demand, (x) => `${x.commodity} · ${x.quantity} ${x.unit}`]].map(([title, kind, items, label]) => (
            <section key={title} className="bg-white rounded-xl border border-[#0F3821]/10 p-5">
              <h2 className="font-heading font-semibold text-lg mb-3 capitalize">{title}</h2>
              {items.length === 0 ? <p className="text-sm text-[#7C8D81]">{t("no_data")}</p> : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {items.map((x) => (
                    <li key={x.id} className="flex justify-between items-center p-3 rounded-lg bg-[#F9F6F0] text-sm" data-testid={`admin-mod-${kind}-${x.id}`}>
                      <div>
                        <p className="font-medium">{label(x)}</p>
                        <p className="text-xs text-[#7C8D81]">{x.status} · {x.created_at?.slice(0, 10)}</p>
                      </div>
                      <button onClick={() => removeContent(kind, x.id)} className="text-[#7C8D81] hover:text-[#E63946]" data-testid={`admin-remove-${kind}-${x.id}`} aria-label={t("delete")}><Trash size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}

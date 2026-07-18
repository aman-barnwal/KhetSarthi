import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, inputCls, EmptyState, Badge, SkeletonCard } from "../components/Shared";
import { UsersThree, Phone, MapPin, Truck } from "@phosphor-icons/react";

const CATEGORIES = ["seeds", "fertilizers", "crop_protection", "equipment", "irrigation", "nursery", "transport", "storage", "produce_buyer", "machinery_services"];

export default function VendorsDir() {
  const { t } = useI18n();
  const [vendors, setVendors] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const load = async () => {
    setVendors(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      if (verifiedOnly) params.set("verified_only", "true");
      const { data } = await api.get(`/vendors?${params}`);
      setVendors(data);
    } catch { setVendors([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cat, verifiedOnly]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("vendors")} subtitle="Seed sellers, input dealers, equipment, transport, storage and more — verified badges shown only after admin review." />
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 flex-1 min-w-[200px]">
          <input className={inputCls} placeholder={`${t("search")}...`} value={q} onChange={(e) => setQ(e.target.value)} data-testid="vendors-search-input" />
        </form>
        <select className={inputCls + " max-w-[200px]"} value={cat} onChange={(e) => setCat(e.target.value)} data-testid="vendors-category-select">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-[#4A5D51]">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} data-testid="vendors-verified-check" />
          {t("verified")}
        </label>
      </div>

      {vendors === null ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div> :
        vendors.length === 0 ? (
          <EmptyState icon={UsersThree} title={t("no_data")} subtitle="No vendors match these filters yet. Vendors appear here after completing onboarding." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 card-lift" data-testid={`vendor-card-${v.id}`}>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-heading font-semibold">{v.business_name}</h3>
                  {v.verified ? <Badge tone="green">{t("verified")}</Badge> : <Badge tone="gray">{t("unverified")}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {v.categories.slice(0, 4).map((c) => <Badge key={c} tone="blue">{c.replace(/_/g, " ")}</Badge>)}
                </div>
                <div className="text-xs text-[#4A5D51] mt-3 space-y-1">
                  {v.location && <p className="flex items-center gap-1.5"><MapPin size={13} />{v.location}</p>}
                  {v.service_area && <p className="flex items-center gap-1.5"><Truck size={13} />{v.service_area}{v.delivery ? ` · ${t("delivery_available")}` : ""}</p>}
                  {v.contact && <p className="flex items-center gap-1.5"><Phone size={13} />{v.contact}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

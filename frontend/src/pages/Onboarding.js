import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { inputCls, btnPrimary, Field, Logo } from "../components/Shared";
import { Plant, Storefront, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";

const CROP_OPTIONS = ["Wheat", "Paddy", "Tomato", "Potato", "Onion", "Maize", "Sugarcane", "Mustard", "Cotton", "Soybean", "Chana", "Arhar"];
const VENDOR_CATEGORIES = ["seeds", "fertilizers", "crop_protection", "equipment", "irrigation", "nursery", "transport", "storage", "produce_buyer", "machinery_services"];

export default function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(user?.language ? (user?.role ? 3 : 2) : 1);
  const [role, setRole] = useState(user?.role || null);
  const [busy, setBusy] = useState(false);
  const [farmer, setFarmer] = useState({ village: "", district: "", state: "", crops: [], farm_size: "", crop_stage: "sowing" });
  const [vendor, setVendor] = useState({ business_name: "", contact: "", categories: [], service_area: "", location_text: "", delivery: false, contact_public: true });

  const pickLanguage = async (code) => {
    setLang(code);
    try { await updateProfile({ language: code }); } catch (e) { toast.error(formatApiError(e)); return; }
    setStep(2);
  };

  const pickRole = async (r) => {
    setRole(r);
    try { await updateProfile({ role: r }); } catch (e) { toast.error(formatApiError(e)); return; }
    setStep(3);
  };

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      const patch = { onboarded: true };
      if (!skip) {
        if (role === "farmer") patch.farmer_profile = farmer;
        else patch.vendor_profile = vendor;
      }
      await updateProfile(patch);
      navigate("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center px-4 py-10">
      <div className="flex items-center gap-2 mb-8 text-[#0F3821]">
        <Logo size={46} text={t("app_name")} />
      </div>
      <div className="flex gap-2 mb-8" aria-hidden>
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 w-14 rounded-full transition-colors ${step >= s ? "bg-[#0F3821]" : "bg-[#0F3821]/15"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="w-full max-w-2xl fade-up">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-center mb-2" data-testid="onboarding-lang-title">{t("choose_language")}</h1>
          <p className="text-sm text-[#4A5D51] text-center mb-8">आप किस भाषा में सहज हैं? · Which language suits you best?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => pickLanguage(l.code)} data-testid={`onboarding-lang-${l.code}`}
                className={`p-4 rounded-xl border text-left card-lift bg-white ${lang === l.code ? "border-[#0F3821] ring-1 ring-[#0F3821]" : "border-[#0F3821]/10"}`}>
                <div className="font-heading font-semibold text-[#1A251E]">{l.native}</div>
                <div className="text-xs text-[#7C8D81]">{l.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-2xl fade-up">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-center mb-8" data-testid="onboarding-role-title">{t("choose_role")}</h1>
          <div className="grid sm:grid-cols-2 gap-5">
            <button onClick={() => pickRole("farmer")} data-testid="onboarding-role-farmer"
              className="bg-white rounded-2xl border border-[#0F3821]/10 p-8 text-center card-lift">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#0F3821] flex items-center justify-center mb-4">
                <Plant size={32} weight="duotone" className="text-[#D69F39]" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">{t("farmer")}</h3>
              <p className="text-sm text-[#4A5D51]">{t("farmer_role_desc")}</p>
            </button>
            <button onClick={() => pickRole("vendor")} data-testid="onboarding-role-vendor"
              className="bg-white rounded-2xl border border-[#0F3821]/10 p-8 text-center card-lift">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#C85A32] flex items-center justify-center mb-4">
                <Storefront size={32} weight="duotone" className="text-white" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">{t("vendor")}</h3>
              <p className="text-sm text-[#4A5D51]">{t("vendor_role_desc")}</p>
            </button>
          </div>
        </div>
      )}

      {step === 3 && role === "farmer" && (
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#0F3821]/10 p-6 sm:p-8 space-y-4 fade-up">
          <h1 className="font-heading text-2xl font-bold" data-testid="onboarding-farmer-title">{t("onboarding_farmer_title")}</h1>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("village")}><input className={inputCls} value={farmer.village} onChange={(e) => setFarmer({ ...farmer, village: e.target.value })} data-testid="farmer-village-input" /></Field>
            <Field label={t("district")}><input className={inputCls} value={farmer.district} onChange={(e) => setFarmer({ ...farmer, district: e.target.value })} data-testid="farmer-district-input" /></Field>
          </div>
          <Field label={t("state")}><input className={inputCls} value={farmer.state} onChange={(e) => setFarmer({ ...farmer, state: e.target.value })} data-testid="farmer-state-input" /></Field>
          <div>
            <p className="text-sm font-medium mb-2">{t("primary_crops")}</p>
            <div className="flex flex-wrap gap-2">
              {CROP_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setFarmer({ ...farmer, crops: toggle(farmer.crops, c) })} data-testid={`farmer-crop-${c.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${farmer.crops.includes(c) ? "bg-[#0F3821] text-white border-[#0F3821]" : "bg-white border-[#0F3821]/15 text-[#4A5D51]"}`}>
                  {farmer.crops.includes(c) && <Check size={12} className="inline mr-1" />}{c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("farm_size")}><input className={inputCls} placeholder="e.g. 2 acre" value={farmer.farm_size} onChange={(e) => setFarmer({ ...farmer, farm_size: e.target.value })} data-testid="farmer-size-input" /></Field>
            <Field label={t("crop_stage")}>
              <select className={inputCls} value={farmer.crop_stage} onChange={(e) => setFarmer({ ...farmer, crop_stage: e.target.value })} data-testid="farmer-stage-select">
                {["sowing", "vegetative", "flowering", "fruiting", "harvest_ready", "post_harvest"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => finish(false)} disabled={busy} className={`${btnPrimary} flex-1 py-3`} data-testid="onboarding-finish-btn">{busy ? t("loading") : t("finish_setup")}</button>
            <button onClick={() => finish(true)} disabled={busy} className="text-sm text-[#7C8D81] hover:text-[#0F3821] transition-colors px-3" data-testid="onboarding-skip-btn">{t("skip")}</button>
          </div>
        </div>
      )}

      {step === 3 && role === "vendor" && (
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#0F3821]/10 p-6 sm:p-8 space-y-4 fade-up">
          <h1 className="font-heading text-2xl font-bold" data-testid="onboarding-vendor-title">{t("onboarding_vendor_title")}</h1>
          <Field label={t("business_name")}><input className={inputCls} value={vendor.business_name} onChange={(e) => setVendor({ ...vendor, business_name: e.target.value })} data-testid="vendor-business-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("contact")}><input className={inputCls} value={vendor.contact} onChange={(e) => setVendor({ ...vendor, contact: e.target.value })} data-testid="vendor-contact-input" /></Field>
            <Field label={t("service_area")}><input className={inputCls} placeholder="e.g. Ranchi district" value={vendor.service_area} onChange={(e) => setVendor({ ...vendor, service_area: e.target.value })} data-testid="vendor-area-input" /></Field>
          </div>
          <Field label={t("village") + " / " + t("district")}><input className={inputCls} value={vendor.location_text} onChange={(e) => setVendor({ ...vendor, location_text: e.target.value })} data-testid="vendor-location-input" /></Field>
          <div>
            <p className="text-sm font-medium mb-2">{t("categories")}</p>
            <div className="flex flex-wrap gap-2">
              {VENDOR_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setVendor({ ...vendor, categories: toggle(vendor.categories, c) })} data-testid={`vendor-cat-${c}`}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${vendor.categories.includes(c) ? "bg-[#C85A32] text-white border-[#C85A32]" : "bg-white border-[#0F3821]/15 text-[#4A5D51]"}`}>
                  {c.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vendor.delivery} onChange={(e) => setVendor({ ...vendor, delivery: e.target.checked })} data-testid="vendor-delivery-check" />
            {t("delivery_available")}
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => finish(false)} disabled={busy} className={`${btnPrimary} flex-1 py-3`} data-testid="onboarding-finish-btn">{busy ? t("loading") : t("finish_setup")}</button>
            <button onClick={() => finish(true)} disabled={busy} className="text-sm text-[#7C8D81] hover:text-[#0F3821] transition-colors px-3" data-testid="onboarding-skip-btn">{t("skip")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, Field, Badge } from "../components/Shared";
import { toast } from "sonner";

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveName = async () => {
    try { await updateProfile({ name }); toast.success(t("save")); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const changeLang = async (code) => {
    setLang(code);
    try { await updateProfile({ language: code }); toast.success(t("save")); } catch (e) {}
  };

  const deleteAccount = async () => {
    try { await api.delete("/profile"); await logout(); navigate("/"); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t("settings")} />

      <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6 space-y-4" data-testid="settings-profile">
        <h2 className="font-heading font-semibold text-lg">{t("account")}</h2>
        <div className="flex items-center gap-2 text-sm text-[#4A5D51]">
          {user.email} · <Badge tone="blue">{user.role || "—"}</Badge>
          {user.verified && <Badge tone="green">{t("verified")}</Badge>}
        </div>
        <Field label={t("name")}>
          <div className="flex gap-2">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name-input" />
            <button onClick={saveName} className={btnPrimary} data-testid="settings-name-save">{t("save")}</button>
          </div>
        </Field>
      </section>

      <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="settings-language">
        <h2 className="font-heading font-semibold text-lg mb-3">{t("language")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => changeLang(l.code)} data-testid={`settings-lang-${l.code}`}
              className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${lang === l.code ? "border-[#0F3821] bg-[#0F3821] text-white" : "border-[#0F3821]/10 hover:bg-[#F0EBE1]"}`}>
              {l.native}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6 text-sm space-y-2" data-testid="settings-legal">
        <h2 className="font-heading font-semibold text-lg mb-2">{t("privacy")} & {t("terms")}</h2>
        <Link to="/legal/privacy" className="block text-[#0F3821] hover:underline" data-testid="settings-privacy-link">{t("privacy")}</Link>
        <Link to="/legal/terms" className="block text-[#0F3821] hover:underline" data-testid="settings-terms-link">{t("terms")}</Link>
        <Link to="/legal/ai-disclaimer" className="block text-[#0F3821] hover:underline" data-testid="settings-disclaimer-link">{t("ai_disclaimer")}</Link>
      </section>

      <section className="bg-white rounded-xl border border-[#E63946]/30 p-6" data-testid="settings-danger">
        <h2 className="font-heading font-semibold text-lg text-[#E63946] mb-2">{t("delete_account")}</h2>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="px-5 py-2.5 rounded-full border border-[#E63946] text-[#E63946] text-sm font-medium hover:bg-[#E63946]/5 transition-colors" data-testid="settings-delete-btn">{t("delete_account")}</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#4A5D51]">{t("delete_confirm")}</p>
            <div className="flex gap-3">
              <button onClick={deleteAccount} className="px-5 py-2.5 rounded-full bg-[#E63946] text-white text-sm font-medium" data-testid="settings-delete-confirm">{t("delete")}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-[#7C8D81] px-2" data-testid="settings-delete-cancel">{t("cancel")}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { inputCls, btnPrimary, Field, Logo } from "../components/Shared";
import { Eye, EyeSlash, ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

const SIDE_IMG = "https://images.pexels.com/photos/4975400/pexels-photo-4975400.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Auth() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup | forgot | reset
  const [form, setForm] = useState({ name: "", email: "", password: "", token: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "login") {
        const u = await login(form.email, form.password);
        navigate(u.onboarded || u.role === "admin" ? "/dashboard" : "/onboarding");
      } else if (mode === "signup") {
        await register(form.name, form.email, form.password);
        navigate("/onboarding");
      } else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email: form.email });
        if (data.reset_token) setForm((f) => ({ ...f, token: data.reset_token }));
        toast.success("Reset token generated. Enter your new password below.");
        setMode("reset");
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", { token: form.token, password: form.password });
        toast.success("Password updated. Please log in.");
        setMode("login");
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F9F6F0]">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-10">
        <Link to="/" className="flex items-center gap-2 mb-10 text-[#0F3821]" data-testid="auth-logo-link">
          <ArrowLeft size={18} /><Logo size={38} text={t("app_name")} />
        </Link>
        <div className="max-w-md w-full">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#1A251E] mb-2" data-testid="auth-title">
            {mode === "login" ? t("login") : mode === "signup" ? t("signup") : mode === "forgot" ? t("forgot_password") : "Reset password"}
          </h1>
          <p className="text-sm text-[#4A5D51] mb-8">
            {mode === "signup" ? "Create your free KhetSarthi account — for farmers and vendors." : t("tagline")}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label={t("name")}>
                <input className={inputCls} value={form.name} onChange={set("name")} required minLength={2} data-testid="auth-name-input" />
              </Field>
            )}
            {mode !== "reset" && (
              <Field label={mode === "login" ? `${t("email")} / Admin ID` : t("email")}>
                <input type={mode === "login" ? "text" : "email"} className={inputCls} value={form.email} onChange={set("email")} required data-testid="auth-email-input" />
              </Field>
            )}
            {mode === "reset" && (
              <Field label="Reset token">
                <input className={inputCls} value={form.token} onChange={set("token")} required data-testid="auth-token-input" />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field label={t("password")}>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} className={inputCls} value={form.password}
                    onChange={set("password")} required minLength={6} data-testid="auth-password-input" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} data-testid="auth-toggle-password"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C8D81]" aria-label="Toggle password visibility">
                    {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            )}
            {error && <p className="text-sm text-[#E63946]" data-testid="auth-error">{error}</p>}
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3`} data-testid="auth-submit-btn">
              {busy ? t("loading") : mode === "login" ? t("login") : mode === "signup" ? t("signup") : t("submit")}
            </button>
          </form>
          <div className="mt-6 flex flex-col gap-2 text-sm text-[#4A5D51]">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-left hover:text-[#0F3821] transition-colors" data-testid="auth-forgot-link">{t("forgot_password")}</button>
                <p>New to KhetSarthi? <button onClick={() => setMode("signup")} className="font-semibold text-[#0F3821] hover:text-[#C85A32] transition-colors" data-testid="auth-switch-signup">{t("signup")}</button></p>
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => setMode("login")} className="text-left hover:text-[#0F3821] transition-colors" data-testid="auth-switch-login">← {t("login")}</button>
            )}
          </div>
          <p className="mt-8 text-xs text-[#7C8D81]">By continuing you agree to our <Link to="/legal/terms" className="underline">{t("terms")}</Link> and <Link to="/legal/privacy" className="underline">{t("privacy")}</Link>.</p>
        </div>
      </div>
      {/* Story side */}
      <div className="hidden lg:block relative">
        <img src={SIDE_IMG} alt="Farmer using technology in the field" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A170F]/90 via-transparent to-transparent" />
        <div className="absolute bottom-0 p-12 text-[#F9F6F0] space-y-3">
          <h2 className="font-heading text-3xl font-bold" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
            Technology made simple for agriculture
          </h2>
          <p className="text-[#F9F6F0]/85 max-w-md" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>
            Weather, prices, buyers, schemes and AI help — in your language, with your voice.
          </p>
        </div>
      </div>
    </div>
  );
}

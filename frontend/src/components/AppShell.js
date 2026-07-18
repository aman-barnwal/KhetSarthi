import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import VoiceAssistant from "./VoiceAssistant";
import { Logo, useTheme } from "./Shared";
import {
  House, CloudSun, Sparkle, Scan, Plant, Handshake, Storefront, UsersThree,
  ChartLineUp, Bank, Wallet, Bell, Gear, Question, MagnifyingGlass, List, X,
  Translate, SignOut, ShieldCheck, DotsThreeCircle, Moon, Sun,
} from "@phosphor-icons/react";

export default function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [dark, toggleTheme] = useTheme();

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setUnread(data.unread_notifications || 0)).catch(() => {});
  }, []);

  const isFarmer = user?.role === "farmer";
  const navItems = [
    { to: "/dashboard", label: t("dashboard"), icon: House },
    { to: "/weather", label: t("weather"), icon: CloudSun },
    { to: "/ai", label: t("krishi_ai"), icon: Sparkle },
    ...(isFarmer ? [{ to: "/scanner", label: t("crop_scanner"), icon: Scan },
                    { to: "/crops", label: t("my_crops"), icon: Plant }] : []),
    { to: "/demand", label: t("demand_supply"), icon: Handshake },
    { to: "/market", label: t("krishi_market"), icon: Storefront },
    { to: "/vendors", label: t("vendors"), icon: UsersThree },
    { to: "/prices", label: t("mandi_prices"), icon: ChartLineUp },
    { to: "/schemes", label: t("schemes"), icon: Bank },
    ...(isFarmer ? [{ to: "/expenses", label: t("expenses"), icon: Wallet }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: t("admin"), icon: ShieldCheck }] : []),
  ];

  const bottomNav = [
    { to: "/dashboard", label: t("home"), icon: House },
    { to: "/demand", label: t("demand_supply"), icon: Handshake },
    { to: "/ai", label: t("krishi_ai"), icon: Sparkle },
    { to: "/prices", label: t("mandi_prices"), icon: ChartLineUp },
  ];

  const changeLang = async (code) => {
    setLang(code); setLangOpen(false);
    try { await updateProfile({ language: code }); } catch (e) { /* offline ok */ }
  };

  const navCls = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-[#0F3821] text-[#F9F6F0]" : "text-[#4A5D51] hover:bg-[#F0EBE1]"}`;

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      {!online && (
        <div className="bg-[#C85A32] text-white text-xs text-center py-1.5 px-4" data-testid="offline-banner">{t("offline")}</div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-[#0F3821]/10 z-30">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-4 py-4" data-testid="sidebar-logo">
          <Logo size={40} text={t("app_name")} className="text-[#0F3821]" />
        </button>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navCls} data-testid={`nav-${item.to.slice(1)}`}>
              <item.icon size={19} weight="duotone" />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[#0F3821]/10 space-y-1">
          <NavLink to="/help" className={navCls} data-testid="nav-help"><Question size={19} weight="duotone" />{t("help")}</NavLink>
          <NavLink to="/settings" className={navCls} data-testid="nav-settings"><Gear size={19} weight="duotone" />{t("settings")}</NavLink>
          <button onClick={async () => { await logout(); navigate("/"); }} data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#C85A32] hover:bg-[#C85A32]/10 transition-colors">
            <SignOut size={19} weight="duotone" />{t("logout")}
          </button>
        </div>
      </aside>

      {/* Top header */}
      <header className="sticky top-0 z-20 glass border-b border-[#0F3821]/10 lg:pl-60">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={30} text={t("app_name")} className="text-[#0F3821]" />
          </div>
          <div className="hidden lg:block text-sm text-[#4A5D51]">
            {user?.name && <span data-testid="header-username">{user.name}</span>}
            {user?.role && <span className="ml-2 text-xs uppercase tracking-wider text-[#7C8D81]">({t(user.role) || user.role})</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate("/search")} data-testid="header-search-btn"
              className="p-2 rounded-full hover:bg-[#F0EBE1] transition-colors" aria-label={t("search")}>
              <MagnifyingGlass size={20} className="text-[#4A5D51]" />
            </button>
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)} data-testid="header-lang-btn"
                className="p-2 rounded-full hover:bg-[#F0EBE1] transition-colors flex items-center gap-1" aria-label={t("language")}>
                <Translate size={20} className="text-[#4A5D51]" />
                <span className="text-xs font-medium text-[#4A5D51] uppercase">{lang}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto bg-white rounded-xl border border-[#0F3821]/10 shadow-xl py-2 z-50" data-testid="lang-dropdown">
                  {LANGUAGES.map((l) => (
                    <button key={l.code} onClick={() => changeLang(l.code)} data-testid={`lang-option-${l.code}`}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F0EBE1] transition-colors ${lang === l.code ? "font-semibold text-[#0F3821]" : "text-[#4A5D51]"}`}>
                      {l.native} <span className="text-xs text-[#7C8D81]">· {l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => navigate("/notifications")} data-testid="header-notifications-btn"
              className="relative p-2 rounded-full hover:bg-[#F0EBE1] transition-colors" aria-label={t("notifications")}>
              <Bell size={20} className="text-[#4A5D51]" />
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C85A32] text-white text-[10px] flex items-center justify-center" data-testid="unread-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="lg:pl-60 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-[#0F3821]/10">
        <div className="grid grid-cols-5 h-16">
          {bottomNav.map((item) => (
            <NavLink key={item.to} to={item.to} data-testid={`bottomnav-${item.to.slice(1)}`}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive ? "text-[#0F3821]" : "text-[#7C8D81]"}`}>
              <item.icon size={22} weight="duotone" />{item.label}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} data-testid="bottomnav-more"
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#7C8D81]">
            <DotsThreeCircle size={22} weight="duotone" />{t("more")}
          </button>
        </div>
      </nav>

      {/* Mobile more drawer */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="more-drawer">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-lg">{t("more")}</h3>
              <button onClick={() => setMoreOpen(false)} data-testid="more-close-btn" className="p-2"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...navItems, { to: "/notifications", label: t("notifications"), icon: Bell },
                { to: "/help", label: t("help"), icon: Question }, { to: "/settings", label: t("settings"), icon: Gear },
                { to: "/about", label: t("about"), icon: List }].map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} data-testid={`more-nav-${item.to.slice(1)}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#F9F6F0] text-[#4A5D51] text-xs text-center hover:bg-[#F0EBE1] transition-colors">
                  <item.icon size={24} weight="duotone" className="text-[#0F3821]" />{item.label}
                </NavLink>
              ))}
              <button onClick={async () => { await logout(); navigate("/"); }} data-testid="more-logout-btn"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#C85A32]/10 text-[#C85A32] text-xs">
                <SignOut size={24} weight="duotone" />{t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      <VoiceAssistant />
    </div>
  );
}

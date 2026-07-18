import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n, LANGUAGES } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import {
  Plant, CloudSun, Sparkle, Scan, Handshake, ChartLineUp, Bank, Microphone,
  Storefront, UsersThree, ArrowRight, Translate, Leaf, Moon, Sun,
} from "@phosphor-icons/react";
import { Logo, useTheme } from "../components/Shared";

const HERO_IMG = "https://images.unsplash.com/photo-1561319612-04c209af8e35?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwzfHxpbmRpYW4lMjBhZ3JpY3VsdHVyZSUyMGZhcm0lMjBzdW5zZXR8ZW58MHx8fHwxNzg0MzY2NDg5fDA&ixlib=rb-4.1.0&q=85";
const FARMER_IMG = "https://images.pexels.com/photos/4975400/pexels-photo-4975400.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const HARVEST_IMG = "https://images.pexels.com/photos/9117894/pexels-photo-9117894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleTheme] = useTheme();
  const cta = () => navigate(user && user !== false ? "/dashboard" : "/auth");

  const features = [
    { icon: CloudSun, title: "Hyperlocal Weather", desc: "GPS-based forecasts converted into farm actions — when to irrigate, when not to spray." },
    { icon: Sparkle, title: "KrishiAI Assistant", desc: "Ask anything about crops, diseases, schemes or prices — by text or voice, in your language." },
    { icon: Scan, title: "Crop Disease Scanner", desc: "Photograph a leaf and get probable conditions with confidence levels and next steps." },
    { icon: Handshake, title: "Demand Before Harvest", desc: "See who needs your crop nearby — before it is even harvested. Declare expected harvests." },
    { icon: ChartLineUp, title: "Live Mandi Prices", desc: "Official Agmarknet prices across markets. Compare mandis, set price alerts." },
    { icon: Bank, title: "Government Schemes", desc: "PM-KISAN, PMFBY, KCC and more — explained simply with official links." },
    { icon: Storefront, title: "Krishi Market", desc: "List produce, receive enquiries, and connect with verified local vendors." },
    { icon: Microphone, title: "Voice-First", desc: "Large buttons, short sentences, and a voice assistant across the whole app." },
  ];

  return (
    <div className="bg-[#0A170F] text-[#F9F6F0]">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 glass-dark">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2">
            <Logo size={38} text={t("app_name")} />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#F9F6F0]/80">
            <Link to="/about" className="hover:text-[#D69F39] transition-colors" data-testid="landing-nav-about">{t("about")}</Link>
            <Link to="/legal/ai-disclaimer" className="hover:text-[#D69F39] transition-colors">{t("ai_disclaimer")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} data-testid="landing-theme-btn" aria-label={t("dark_mode")}
              className="p-2 rounded-full text-[#F9F6F0]/80 hover:text-[#D69F39] transition-colors">
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button onClick={() => navigate("/auth")} data-testid="landing-login-btn"
              className="px-4 py-2 rounded-full text-sm font-medium text-[#F9F6F0] hover:text-[#D69F39] transition-colors">{t("login")}</button>
            <button onClick={cta} data-testid="landing-getstarted-btn"
              className="px-5 py-2 rounded-full bg-[#D69F39] text-[#0A170F] text-sm font-semibold hover:bg-[#e5b355] transition-colors">{t("get_started")}</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center grain overflow-hidden">
        <img src={HERO_IMG} alt="Indian farmland at sunrise" loading="eager"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A170F]/95 via-[#0A170F]/70 to-[#0A170F]/30" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
          <div className="max-w-2xl space-y-6">
            <div className="fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D69F39]/40 text-[#D69F39] text-xs uppercase tracking-[0.2em]">
              <Leaf size={14} weight="duotone" /> Kisan · Vendor · Village Network
            </div>
            <h1 className="fade-up-1 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight" style={{ textShadow: "0 2px 24px rgba(0,0,0,0.5)" }} data-testid="hero-title">
              {t("hero_title")}
            </h1>
            <p className="fade-up-2 text-base sm:text-lg text-[#F9F6F0]/85 leading-relaxed max-w-xl" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}>
              {t("hero_sub")}
            </p>
            <div className="fade-up-3 flex flex-wrap gap-3 pt-2">
              <button onClick={cta} data-testid="hero-cta-farmer"
                className="px-7 py-3.5 rounded-full bg-[#D69F39] text-[#0A170F] font-semibold hover:bg-[#e5b355] hover:scale-[1.02] transition-[background-color,transform] flex items-center gap-2">
                {t("cta_farmer")} <ArrowRight size={18} />
              </button>
              <button onClick={cta} data-testid="hero-cta-vendor"
                className="px-7 py-3.5 rounded-full border border-[#F9F6F0]/30 text-[#F9F6F0] font-medium hover:bg-[#F9F6F0]/10 transition-colors">
                {t("cta_vendor")}
              </button>
            </div>
            <div className="fade-up-4 flex flex-wrap gap-8 pt-6">
              {[[LANGUAGES.length, t("stat_langs")], ["10+", t("stat_schemes")], ["28+", t("stat_commodities")]].map(([v, l], i) => (
                <div key={i}>
                  <div className="font-heading text-3xl font-bold text-[#D69F39]">{v}</div>
                  <div className="text-xs text-[#F9F6F0]/70 uppercase tracking-wider">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#F9F6F0] text-[#1A251E] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-[#C85A32] font-medium mb-3">The Closed Agricultural Loop</p>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Plan, grow, protect, sell and settle — one connected ecosystem
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#0F3821]/10 p-6 card-lift" data-testid={`feature-card-${i}`}>
                <div className="w-11 h-11 rounded-lg bg-[#0F3821] flex items-center justify-center mb-4">
                  <f.icon size={22} weight="duotone" className="text-[#D69F39]" />
                </div>
                <h3 className="font-heading font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-[#4A5D51] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demand before harvest highlight */}
      <section className="bg-[#0F3821] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#D69F39] font-medium">Demand Before Harvest</p>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Know who needs your tomatoes — before you pick them
            </h2>
            <p className="text-[#F9F6F0]/80 leading-relaxed">
              Vendors and buyers post what they need. Farmers declare expected harvests. KhetSarthi matches
              both sides by commodity, quantity and timing — so produce meets demand before it becomes perishable.
            </p>
            <button onClick={cta} data-testid="demand-section-cta"
              className="px-6 py-3 rounded-full bg-[#D69F39] text-[#0A170F] font-semibold hover:bg-[#e5b355] transition-colors inline-flex items-center gap-2">
              Explore the Exchange <ArrowRight size={18} />
            </button>
          </div>
          <img src={HARVEST_IMG} alt="Freshly harvested onions in a farmer's hands" loading="lazy"
            className="rounded-2xl w-full h-72 lg:h-96 object-cover" />
        </div>
      </section>

      {/* Voice + languages */}
      <section className="bg-[#F9F6F0] text-[#1A251E] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <img src={FARMER_IMG} alt="Farmer using a tablet in a sunflower field" loading="lazy"
            className="rounded-2xl w-full h-72 lg:h-96 object-cover order-last lg:order-first" />
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#C85A32] font-medium">Voice-First Agriculture</p>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Speak to your farm's operating system — in {LANGUAGES.length} Indian languages
            </h2>
            <p className="text-[#4A5D51] leading-relaxed">
              "What is today's tomato price?" · "Will it rain tomorrow?" · "Which schemes can I apply for?"
              — KhetSarthi is built for farmers who prefer speaking over typing, with large touch targets and voice playback.
            </p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.slice(0, 12).map((l) => (
                <span key={l.code} className="px-3 py-1 rounded-full bg-white border border-[#0F3821]/10 text-sm">{l.native}</span>
              ))}
              <span className="px-3 py-1 rounded-full bg-[#0F3821] text-[#F9F6F0] text-sm">+{LANGUAGES.length - 12}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A170F] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Logo size={36} text={t("app_name")} />
              </div>
              <p className="text-sm text-[#F9F6F0]/60 leading-relaxed max-w-xs">{t("tagline")}. Built with dignity, transparency and usefulness at the core.</p>
            </div>
            <div className="text-sm space-y-2 text-[#F9F6F0]/70">
              <Link to="/about" className="block hover:text-[#D69F39] transition-colors" data-testid="footer-about">{t("about")} & {t("co_founders")}</Link>
              <Link to="/auth" className="block hover:text-[#D69F39] transition-colors">{t("login")} / {t("signup")}</Link>
            </div>
            <div className="text-sm space-y-2 text-[#F9F6F0]/70">
              <Link to="/legal/privacy" className="block hover:text-[#D69F39] transition-colors" data-testid="footer-privacy">{t("privacy")}</Link>
              <Link to="/legal/terms" className="block hover:text-[#D69F39] transition-colors">{t("terms")}</Link>
              <Link to="/legal/ai-disclaimer" className="block hover:text-[#D69F39] transition-colors">{t("ai_disclaimer")}</Link>
            </div>
          </div>
          <p className="text-xs text-[#F9F6F0]/40 mt-10">© {new Date().getFullYear()} KhetSarthi. Weather by Open-Meteo · Mandi prices by data.gov.in (Agmarknet) · Maps © OpenStreetMap contributors.</p>
        </div>
      </footer>
    </div>
  );
}

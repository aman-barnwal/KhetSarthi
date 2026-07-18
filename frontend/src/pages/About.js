import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { ArrowLeft, Play, CaretRight } from "@phosphor-icons/react";
import { Logo } from "../components/Shared";

const FOUNDERS = [
  { name: "Swastika Kumari", img: "/swastika.jpg" },
  { name: "Aman Barnwal", img: "/aman.jpg" },
];

const CHAPTERS = [
  "Registration & language selection", "Choosing Farmer or Vendor", "Dashboard tour",
  "Using the voice assistant", "Weather intelligence", "Asking KrishiAI",
  "Scanning crop diseases", "Demand & Supply Exchange", "Checking mandi prices",
  "Selling produce on Krishi Market", "Buying inputs & finding vendors",
  "Government schemes", "Expenses & farm records", "Reminders & notifications", "Profile & settings",
];

export default function About() {
  const { t } = useI18n();
  const [chapter, setChapter] = useState(0);

  return (
    <div className="bg-[#F9F6F0] min-h-screen">
      <header className="glass sticky top-0 z-30 border-b border-[#0F3821]/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link to="/" className="flex items-center gap-2 text-[#0F3821]" data-testid="about-back-link">
            <ArrowLeft size={18} /><Logo size={34} text={t("app_name")} />
          </Link>
          <Link to="/auth" className="px-4 py-2 rounded-full bg-[#0F3821] text-white text-sm font-medium" data-testid="about-login-btn">{t("get_started")}</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        <section className="max-w-3xl fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C85A32] font-medium mb-3">{t("about")}</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-5">One intelligent ecosystem for Indian agriculture</h1>
          <div className="space-y-4 text-[#4A5D51] leading-relaxed">
            <p>Indian farmers make dozens of critical decisions every season — what to sow, when to irrigate, how to treat a diseased crop, where to sell, and at what price. Today those decisions are scattered across weather apps, middlemen, WhatsApp groups, mandi visits, and guesswork.</p>
            <p>KhetSarthi brings them into one place: hyperlocal weather converted into farm actions, an AI assistant that speaks the farmer's language, crop disease scanning, official mandi prices, government schemes explained simply, farm records — and most importantly, a Demand & Supply Exchange that connects buyers to farmers <em>before harvest</em>, when selling decisions matter most.</p>
            <p>Our approach combines technology with a real ground network: Panchayats, FPOs, cooperatives, local vendors and trained facilitators — so digital intelligence reaches fields, not just phones. The experience is grounded in dignity, independence and transparency: no exaggerated promises, no fabricated data, and clear disclaimers wherever AI or forecasts are involved.</p>
          </div>
        </section>

        <section className="fade-up-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-4">{t("co_founders")}</h2>
          <div className="bg-white rounded-2xl border border-[#0F3821]/10 p-6 max-w-3xl mb-8" data-testid="our-story">
            <p className="text-xs uppercase tracking-[0.25em] text-[#C85A32] font-medium mb-2">{t("our_story")}</p>
            <p className="text-[#4A5D51] leading-relaxed text-sm sm:text-base">
              We started this journey together in college — two students who kept asking the same question:
              why does the farmer, who feeds everyone, get the least help from technology? KhetSarthi
              (हर खेत का सारथी) is our answer. Together we are building one platform that stands beside
              every farm — with honest weather guidance, fair market visibility, AI help in the farmer's
              own language, and buyers who arrive before the harvest does. This is only the beginning,
              and we are building it side by side with the farmers it serves.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="bg-white rounded-2xl border border-[#0F3821]/10 overflow-hidden card-lift" data-testid={`cofounder-${f.name.split(" ")[0].toLowerCase()}`}>
                <img src={f.img} alt={f.name} className="w-full h-80 object-cover object-top" loading="lazy" />
                <div className="p-5">
                  <h3 className="font-heading font-bold text-lg">{f.name}</h3>
                  <p className="text-sm text-[#C85A32] font-medium">Co-Founder, KhetSarthi</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="fade-up-2" id="tutorial">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-2">{t("tutorial")}</h2>
          <p className="text-sm text-[#4A5D51] mb-6 max-w-2xl">A complete walkthrough of the platform. The tutorial video below is a replaceable placeholder — the final production video will cover every chapter listed here.</p>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="relative rounded-2xl overflow-hidden bg-[#0A170F] aspect-video shadow-lg" data-testid="tutorial-video-player">
                {/* Replace `src` with the final tutorial video asset when available */}
                <video className="w-full h-full" controls preload="none"
                  poster="https://images.unsplash.com/photo-1561319612-04c209af8e35?crop=entropy&cs=srgb&fm=jpg&q=60&w=1200">
                  <source src="" type="video/mp4" />
                </video>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-[#D69F39]/90 flex items-center justify-center"><Play size={28} weight="fill" className="text-[#0A170F]" /></div>
                  <p className="text-[#F9F6F0] text-sm px-6 text-center" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>Tutorial video coming soon — chapter guide available on the right</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#0F3821]/10 p-5 mt-4" data-testid="tutorial-chapter-detail">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C85A32] font-medium">Chapter {chapter + 1}</p>
                <h3 className="font-heading font-semibold text-lg mt-1">{CHAPTERS[chapter]}</h3>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#0F3821]/10 p-4 max-h-[480px] overflow-y-auto" data-testid="tutorial-chapters">
              {CHAPTERS.map((c, i) => (
                <button key={i} onClick={() => setChapter(i)} data-testid={`tutorial-chapter-${i}`}
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${chapter === i ? "bg-[#0F3821] text-white" : "text-[#4A5D51] hover:bg-[#F0EBE1]"}`}>
                  <span>{i + 1}. {c}</span><CaretRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

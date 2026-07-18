import React from "react";
import { Plant } from "@phosphor-icons/react";

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="loading-spinner">
      <Plant size={36} weight="duotone" className="text-[#0F3821] animate-bounce" />
      {label && <p className="text-sm text-[#7C8D81]">{label}</p>}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-xl border border-[#0F3821]/10 p-6 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action, testId }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 gap-3" data-testid={testId || "empty-state"}>
      {Icon && <div className="w-14 h-14 rounded-full bg-[#F0EBE1] flex items-center justify-center"><Icon size={28} weight="duotone" className="text-[#8A9A5B]" /></div>}
      <h3 className="font-heading font-semibold text-lg text-[#1A251E]">{title}</h3>
      {subtitle && <p className="text-sm text-[#4A5D51] max-w-sm">{subtitle}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, retryLabel = "Retry" }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 gap-3" data-testid="error-state">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl text-[#E63946] font-bold">!</div>
      <p className="text-sm text-[#4A5D51] max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} data-testid="error-retry-btn"
          className="px-5 py-2 rounded-full bg-[#0F3821] text-[#F9F6F0] text-sm font-medium hover:bg-[#1a4d30] transition-colors">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#1A251E]">{title}</h1>
        {subtitle && <p className="text-sm text-[#4A5D51] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "green", testId }) {
  const tones = {
    green: "bg-[#0F3821] text-[#F9F6F0]",
    gold: "bg-[#D69F39]/15 text-[#8a6516]",
    cream: "bg-white text-[#1A251E] border border-[#0F3821]/10",
    terra: "bg-[#C85A32]/10 text-[#C85A32]",
  };
  return (
    <div className={`rounded-xl p-5 card-lift ${tones[tone] || tones.cream}`} data-testid={testId}>
      <div className="flex items-center gap-2 opacity-80 text-xs uppercase tracking-[0.15em] font-medium">
        {Icon && <Icon size={16} weight="duotone" />}{label}
      </div>
      <div className="font-heading text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

export function Badge({ children, tone = "green" }) {
  const tones = {
    green: "bg-[#2D6A4F]/10 text-[#2D6A4F]",
    gold: "bg-[#D69F39]/15 text-[#8a6516]",
    red: "bg-[#E63946]/10 text-[#E63946]",
    gray: "bg-[#F0EBE1] text-[#4A5D51]",
    blue: "bg-[#457B9D]/10 text-[#457B9D]",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#1A251E]">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-[#0F3821]/15 bg-white text-sm text-[#1A251E] placeholder:text-[#7C8D81] focus:border-[#D69F39] focus:ring-1 focus:ring-[#D69F39] outline-none transition-colors";
export const btnPrimary = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0F3821] text-[#F9F6F0] text-sm font-medium hover:bg-[#1a4d30] active:scale-[0.98] transition-[background-color,transform] disabled:opacity-50 disabled:cursor-not-allowed";
export const btnSecondary = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#0F3821]/20 bg-white text-[#0F3821] text-sm font-medium hover:bg-[#F0EBE1] active:scale-[0.98] transition-[background-color,transform]";

export function Logo({ size = 34, text, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/logo.png" alt="KhetSarthi logo" style={{ width: size, height: size }} className="object-contain" />
      {text && <span className="font-heading font-bold" style={{ fontSize: size * 0.56 }}>{text}</span>}
    </span>
  );
}

export function useTheme() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => setDark((d) => {
    const nd = !d;
    document.documentElement.classList.toggle("dark", nd);
    localStorage.setItem("ky_theme", nd ? "dark" : "light");
    return nd;
  });
  return [dark, toggle];
}

export function Md({ text }) {
  const lines = (text || "").split("\n");
  const out = [];
  let list = [];
  const fmt = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : p);
  const flush = (k) => {
    if (list.length) { out.push(<ul key={`l${k}`} className="list-disc pl-5 space-y-1">{list}</ul>); list = []; }
  };
  lines.forEach((ln, i) => {
    const bullet = ln.match(/^\s*[*\-•]\s+(.*)/);
    if (bullet) { list.push(<li key={i}>{fmt(bullet[1])}</li>); return; }
    flush(i);
    if (ln.trim()) out.push(<p key={i}>{fmt(ln)}</p>);
  });
  flush("end");
  return <div className="space-y-1.5">{out}</div>;
}

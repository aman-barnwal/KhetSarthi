import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { SkeletonCard, EmptyState, Badge, StatCard, btnSecondary } from "../components/Shared";
import { Plant, CloudSun, Handshake, Wallet, Bell, Sparkle, Scan, ChartLineUp, ArrowRight, CalendarCheck } from "@phosphor-icons/react";

function WeatherCard({ t }) {
  const [wx, setWx] = useState(null);
  const [place, setPlace] = useState(null);
  const [state, setState] = useState("idle");
  useEffect(() => {
    if (!navigator.geolocation) { setState("unsupported"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const [w, p] = await Promise.all([
          api.get(`/weather?lat=${lat}&lon=${lon}`),
          api.get(`/geocode/reverse?lat=${lat}&lon=${lon}`),
        ]);
        setWx(w.data); setPlace(p.data); setState("ok");
      } catch { setState("error"); }
    }, () => setState("denied"), { timeout: 10000 });
  }, []);
  if (state === "idle") return <SkeletonCard lines={3} />;
  if (state !== "ok") return (
    <Link to="/weather" className="block bg-white rounded-xl border border-[#0F3821]/10 p-6 card-lift" data-testid="dashboard-weather-card">
      <div className="flex items-center gap-2 text-[#4A5D51]"><CloudSun size={22} weight="duotone" className="text-[#D69F39]" /><span className="font-heading font-semibold">{t("weather")}</span></div>
      <p className="text-sm text-[#7C8D81] mt-2">{state === "denied" ? t("location_denied") : t("error_generic")}</p>
    </Link>
  );
  const cur = wx.data.current;
  return (
    <Link to="/weather" className="block rounded-xl bg-[#0F3821] text-[#F9F6F0] p-6 card-lift relative overflow-hidden" data-testid="dashboard-weather-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] opacity-80"><CloudSun size={16} weight="duotone" />{t("weather")}</div>
          <div className="font-heading text-4xl font-bold mt-2">{Math.round(cur.temperature_2m)}°C</div>
          <p className="text-sm opacity-80 mt-1">{place?.village || ""}{place?.district ? `, ${place.district}` : ""}</p>
        </div>
        <div className="text-right text-sm opacity-85 space-y-1">
          <p>{t("humidity")}: {cur.relative_humidity_2m}%</p>
          <p>{t("wind")}: {Math.round(cur.wind_speed_10m)} km/h</p>
        </div>
      </div>
      {wx.advisories?.length > 0 && (
        <div className="mt-4 bg-white/10 rounded-lg px-3 py-2 text-sm">{t(wx.advisories[0].key)}</div>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setData(data)).catch(() => setError(true));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("good_morning") : hour < 17 ? t("good_afternoon") : t("good_evening");

  if (error) return <EmptyState title={t("error_generic")} />;
  if (!data) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight" data-testid="dashboard-greeting">{greeting}, {user.name?.split(" ")[0]}</h1>
        <p className="text-sm text-[#4A5D51] mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {data.role === "farmer" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3 fade-up-1">
            <div className="lg:col-span-2"><WeatherCard t={t} /></div>
            <Link to="/ai" className="rounded-xl bg-[#D69F39] p-6 card-lift flex flex-col justify-between" data-testid="dashboard-ai-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#0A170F]/70"><Sparkle size={16} weight="duotone" />{t("krishi_ai")}</div>
              <div>
                <p className="font-heading text-lg font-bold text-[#0A170F] mt-3">{t("ask_krishi_ai")}</p>
                <p className="text-sm text-[#0A170F]/70 mt-1">{t("voice_hint")}</p>
              </div>
              <ArrowRight size={20} className="text-[#0A170F] self-end" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-up-2">
            <StatCard icon={Plant} label={t("my_crops")} value={data.crops.length} tone="cream" testId="stat-crops" />
            <StatCard icon={Handshake} label={t("demand_matches")} value={data.demand_matches.length} tone="gold" testId="stat-matches" />
            <StatCard icon={Wallet} label={t("total_expense")} value={`₹${data.expense_summary.expense.toLocaleString("en-IN")}`} tone="cream" testId="stat-expense" />
            <StatCard icon={Bell} label={t("notifications")} value={data.unread_notifications} tone="terra" testId="stat-notifications" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="dashboard-demand-section">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading font-semibold text-lg">{t("demand_matches")}</h2>
                <Link to="/demand" className="text-sm text-[#C85A32] font-medium hover:underline">{t("view_all")}</Link>
              </div>
              {data.demand_matches.length === 0 ? (
                <EmptyState icon={Handshake} title={t("no_data")} subtitle={t("no_demand_empty")}
                  action={<button onClick={() => navigate("/demand")} className={btnSecondary} data-testid="dashboard-declare-harvest-btn">{t("declare_harvest")}</button>} />
              ) : (
                <ul className="space-y-3">
                  {data.demand_matches.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F9F6F0]">
                      <div>
                        <p className="font-medium text-sm capitalize">{d.commodity} · {d.quantity} {d.unit}</p>
                        <p className="text-xs text-[#7C8D81]">{d.poster_name} {d.district ? `· ${d.district}` : ""} {d.required_by ? `· by ${d.required_by}` : ""}</p>
                      </div>
                      {d.offered_price && <Badge tone="gold">₹{d.offered_price}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="dashboard-reminders-section">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading font-semibold text-lg">{t("reminders")}</h2>
                <Link to="/crops" className="text-sm text-[#C85A32] font-medium hover:underline">{t("view_all")}</Link>
              </div>
              {data.reminders.length === 0 ? (
                <EmptyState icon={CalendarCheck} title={t("no_data")} subtitle="Add irrigation, spraying or harvest reminders from My Crops." />
              ) : (
                <ul className="space-y-3">
                  {data.reminders.map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F9F6F0]">
                      <div>
                        <p className="font-medium text-sm">{r.title}</p>
                        <p className="text-xs text-[#7C8D81]">{r.due_date} · {r.reminder_type}</p>
                      </div>
                      <Badge tone="blue">{r.reminder_type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 fade-up-3">
            {[{ to: "/scanner", icon: Scan, label: t("scan_crop") }, { to: "/prices", icon: ChartLineUp, label: t("mandi_prices") }, { to: "/market", icon: Handshake, label: t("sell_produce") }].map((q) => (
              <Link key={q.to} to={q.to} data-testid={`quick-${q.to.slice(1)}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-[#0F3821]/10 p-4 card-lift">
                <div className="w-10 h-10 rounded-lg bg-[#0F3821] flex items-center justify-center"><q.icon size={20} weight="duotone" className="text-[#D69F39]" /></div>
                <span className="font-medium text-sm">{q.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {data.role === "vendor" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-up-1">
            <StatCard icon={Handshake} label={t("post_demand")} value={data.my_demands.length} tone="cream" testId="stat-demands" />
            <StatCard icon={Plant} label={t("supply_matches")} value={data.supply_matches.length} tone="gold" testId="stat-supply" />
            <StatCard icon={Bell} label={t("enquiries")} value={data.enquiries.length} tone="cream" testId="stat-enquiries" />
            <div className="rounded-xl p-5 bg-white border border-[#0F3821]/10" data-testid="stat-verification">
              <div className="text-xs uppercase tracking-[0.15em] text-[#7C8D81]">{t("status")}</div>
              <div className="mt-2">{data.verified ? <Badge tone="green">{t("verified")}</Badge> : <Badge tone="gray">{t("unverified")}</Badge>}</div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="vendor-supply-section">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading font-semibold text-lg">{t("supply_matches")}</h2>
                <Link to="/demand" className="text-sm text-[#C85A32] font-medium hover:underline">{t("view_all")}</Link>
              </div>
              {data.supply_matches.length === 0 ? (
                <EmptyState icon={Plant} title={t("no_data")} subtitle="Post demand for commodities you need — farmers declaring harvests will be matched here."
                  action={<button onClick={() => navigate("/demand")} className={btnSecondary} data-testid="vendor-post-demand-btn">{t("post_demand")}</button>} />
              ) : (
                <ul className="space-y-3">
                  {data.supply_matches.map((h) => (
                    <li key={h.id} className="p-3 rounded-lg bg-[#F9F6F0]">
                      <p className="font-medium text-sm capitalize">{h.commodity} · {h.expected_quantity} {h.unit}</p>
                      <p className="text-xs text-[#7C8D81]">{h.farmer_name} {h.district ? `· ${h.district}` : ""} {h.harvest_window_start ? `· ${h.harvest_window_start}` : ""}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="vendor-enquiries-section">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading font-semibold text-lg">{t("enquiries")}</h2>
                <Link to="/market" className="text-sm text-[#C85A32] font-medium hover:underline">{t("view_all")}</Link>
              </div>
              {data.enquiries.length === 0 ? (
                <EmptyState icon={Bell} title={t("no_data")} subtitle="Enquiries from farmers on your listings and demand posts will appear here." />
              ) : (
                <ul className="space-y-3">
                  {data.enquiries.slice(0, 5).map((e) => (
                    <li key={e.id} className="p-3 rounded-lg bg-[#F9F6F0]">
                      <p className="font-medium text-sm">{e.from_name} · {e.subject}</p>
                      <p className="text-xs text-[#7C8D81] truncate">{e.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {data.role === "admin" && (
        <div className="bg-white rounded-xl border border-[#0F3821]/10 p-8 text-center">
          <p className="text-[#4A5D51] mb-4">Admin account — open the admin dashboard to manage the platform.</p>
          <Link to="/admin" className="inline-flex px-6 py-3 rounded-full bg-[#0F3821] text-white text-sm font-medium" data-testid="goto-admin-btn">{t("admin")} →</Link>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { PageHeader, SkeletonCard, ErrorState, inputCls, btnPrimary } from "../components/Shared";
import { CloudSun, CloudRain, Sun, CloudLightning, Cloud, Snowflake, Wind, Drop, SunHorizon, MapPin, Warning } from "@phosphor-icons/react";

const wmoIcon = (code, size = 28) => {
  if (code === 0) return <Sun size={size} weight="duotone" className="text-[#D69F39]" />;
  if (code <= 3) return <CloudSun size={size} weight="duotone" className="text-[#8A9A5B]" />;
  if (code <= 48) return <Cloud size={size} weight="duotone" className="text-[#7C8D81]" />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={size} weight="duotone" className="text-[#457B9D]" />;
  if (code <= 77 || code === 85 || code === 86) return <Snowflake size={size} weight="duotone" className="text-[#457B9D]" />;
  return <CloudLightning size={size} weight="duotone" className="text-[#C85A32]" />;
};

const bgFor = (code, isDay) => {
  if (!isDay) return "from-[#0A170F] to-[#1a2f22] text-[#F9F6F0]";
  if (code === 0 || code <= 3) return "from-[#0F3821] to-[#2D6A4F] text-[#F9F6F0]";
  if (code >= 51) return "from-[#31465c] to-[#457B9D] text-[#F9F6F0]";
  return "from-[#4A5D51] to-[#7C8D81] text-[#F9F6F0]";
};

export default function WeatherPage() {
  const { t } = useI18n();
  const [wx, setWx] = useState(null);
  const [place, setPlace] = useState(null);
  const [status, setStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const load = useCallback(async (lat, lon, placeInfo) => {
    setStatus("loading");
    try {
      const { data } = await api.get(`/weather?lat=${lat}&lon=${lon}`);
      setWx(data);
      if (placeInfo) setPlace(placeInfo);
      else api.get(`/geocode/reverse?lat=${lat}&lon=${lon}`).then(({ data }) => setPlace(data)).catch(() => {});
      setStatus("ok");
    } catch { setStatus("error"); }
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) { setStatus("denied"); return; }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => setStatus("denied"), { timeout: 10000 });
  }, [load]);

  useEffect(() => { locateMe(); }, [locateMe]);

  const search = async (e) => {
    e.preventDefault();
    if (query.length < 2) return;
    try { const { data } = await api.get(`/geocode/search?q=${encodeURIComponent(query)}`); setResults(data); } catch { setResults([]); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("weather")} subtitle={t("decision_support_note")} />
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={locateMe} className={btnPrimary} data-testid="weather-gps-btn"><MapPin size={16} />{t("use_my_location")}</button>
        <form onSubmit={search} className="flex gap-2 flex-1 min-w-[220px]">
          <input className={inputCls} placeholder={`${t("search")}...`} value={query} onChange={(e) => setQuery(e.target.value)} data-testid="weather-search-input" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#F0EBE1] text-sm font-medium hover:bg-[#e5ddcd] transition-colors" data-testid="weather-search-btn">{t("search")}</button>
        </form>
      </div>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="weather-search-results">
          {results.map((r, i) => (
            <button key={i} onClick={() => { setResults([]); load(r.lat, r.lon, { village: r.name, district: r.district, state: r.state }); }}
              className="px-3 py-1.5 rounded-full bg-white border border-[#0F3821]/10 text-sm hover:border-[#D69F39] transition-colors" data-testid={`weather-result-${i}`}>
              {r.name}{r.state ? `, ${r.state}` : ""}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && <div className="grid gap-4"><SkeletonCard lines={4} /><SkeletonCard lines={3} /></div>}
      {status === "denied" && <ErrorState message={t("location_denied")} onRetry={locateMe} retryLabel={t("use_my_location")} />}
      {status === "error" && <ErrorState message={t("error_generic")} onRetry={locateMe} retryLabel={t("retry")} />}

      {status === "ok" && wx && (() => {
        const cur = wx.data.current;
        const daily = wx.data.daily;
        const hourly = wx.data.hourly;
        const nowIdx = Math.max(0, hourly.time.findIndex((tm) => new Date(tm) >= new Date()));
        return (
          <>
            <section className={`rounded-2xl bg-gradient-to-br ${bgFor(cur.weather_code, cur.is_day)} p-7 relative overflow-hidden`} data-testid="weather-current-card">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  {place && <p className="text-sm opacity-85 flex items-center gap-1" data-testid="weather-place"><MapPin size={14} />{[place.village, place.district, place.state].filter(Boolean).join(", ") || "Your location"}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="float-leaf">{wmoIcon(cur.weather_code, 56)}</span>
                    <span className="font-heading text-6xl font-bold">{Math.round(cur.temperature_2m)}°</span>
                  </div>
                  <p className="text-sm opacity-85 mt-1">{t("feels_like")} {Math.round(cur.apparent_temperature)}°C</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <span className="flex items-center gap-2 opacity-90"><Drop size={16} />{t("humidity")}: {cur.relative_humidity_2m}%</span>
                  <span className="flex items-center gap-2 opacity-90"><Wind size={16} />{t("wind")}: {Math.round(cur.wind_speed_10m)} km/h</span>
                  <span className="flex items-center gap-2 opacity-90"><CloudRain size={16} />{t("rain_chance")}: {daily.precipitation_probability_max[0]}%</span>
                  <span className="flex items-center gap-2 opacity-90"><SunHorizon size={16} />{daily.sunrise[0].slice(11)} / {daily.sunset[0].slice(11)}</span>
                </div>
              </div>
            </section>

            {wx.advisories.length > 0 && (
              <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="weather-advisories">
                <h2 className="font-heading font-semibold text-lg mb-3">{t("farm_advisories")}</h2>
                <ul className="space-y-2">
                  {wx.advisories.map((a, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm p-3 rounded-lg ${a.severity === "warning" ? "bg-[#E9C46A]/20 text-[#7a5c10]" : "bg-[#457B9D]/10 text-[#2f5872]"}`}>
                      <Warning size={17} weight="duotone" className="shrink-0 mt-0.5" />{t(a.key)}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#7C8D81] mt-3">{t("decision_support_note")}</p>
              </section>
            )}

            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="weather-hourly">
              <h2 className="font-heading font-semibold text-lg mb-4">{t("hourly_forecast")}</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {hourly.time.slice(nowIdx, nowIdx + 24).map((tm, i) => (
                  <div key={tm} className="flex flex-col items-center gap-1.5 min-w-[58px]">
                    <span className="text-xs text-[#7C8D81]">{tm.slice(11, 16)}</span>
                    {wmoIcon(hourly.weather_code[nowIdx + i], 22)}
                    <span className="text-sm font-semibold">{Math.round(hourly.temperature_2m[nowIdx + i])}°</span>
                    <span className="text-[10px] text-[#457B9D]">{hourly.precipitation_probability[nowIdx + i]}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="weather-weekly">
              <h2 className="font-heading font-semibold text-lg mb-4">{t("weekly_forecast")}</h2>
              <ul className="divide-y divide-[#0F3821]/5">
                {daily.time.map((d, i) => (
                  <li key={d} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="w-24 font-medium">{i === 0 ? t("today") : new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</span>
                    {wmoIcon(daily.weather_code[i], 22)}
                    <span className="text-[#457B9D] w-12 text-center">{daily.precipitation_probability_max[i]}%</span>
                    <span className="w-24 text-right"><strong>{Math.round(daily.temperature_2m_max[i])}°</strong> <span className="text-[#7C8D81]">/ {Math.round(daily.temperature_2m_min[i])}°</span></span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#7C8D81] mt-3">{t("source")}: {wx.source}</p>
            </section>
          </>
        );
      })()}
    </div>
  );
}

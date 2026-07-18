import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, Field, EmptyState, Badge, SkeletonCard } from "../components/Shared";
import { Plant, Notebook, BellRinging, Plus, Trash, CheckCircle, Circle } from "@phosphor-icons/react";
import { toast } from "sonner";

const ACTIVITY_TYPES = ["sowing", "irrigation", "fertilizer", "pesticide", "labor", "machinery", "rainfall", "harvest", "transport", "other"];
const REMINDER_TYPES = ["irrigation", "fertilizer", "spraying", "crop_check", "harvest", "market", "scheme", "other"];
const STAGES = ["sowing", "vegetative", "flowering", "fruiting", "harvest_ready", "post_harvest"];

export default function Crops() {
  const { t } = useI18n();
  const [tab, setTab] = useState("crops");
  const [crops, setCrops] = useState(null);
  const [diary, setDiary] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => {
    api.get("/crops").then(({ data }) => setCrops(data)).catch(() => setCrops([]));
    api.get("/diary").then(({ data }) => setDiary(data)).catch(() => setDiary([]));
    api.get("/reminders").then(({ data }) => setReminders(data)).catch(() => setReminders([]));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (tab === "crops") await api.post("/crops", form);
      else if (tab === "diary") await api.post("/diary", form);
      else await api.post("/reminders", form);
      toast.success(t("save"));
      setForm(null); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (path, id) => { try { await api.delete(`/${path}/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); } };
  const toggleDone = async (r) => { try { await api.patch(`/reminders/${r.id}`, { done: !r.done }); load(); } catch (e) {} };

  const tabs = [
    { key: "crops", label: t("my_crops"), icon: Plant },
    { key: "diary", label: t("farm_diary"), icon: Notebook },
    { key: "reminders", label: t("reminders"), icon: BellRinging },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("my_crops")}
        action={<button onClick={() => setForm({})} className={btnPrimary} data-testid="crops-add-btn"><Plus size={16} />{t("add")}</button>} />
      <div className="flex gap-2">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => { setTab(tb.key); setForm(null); }} data-testid={`crops-tab-${tb.key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${tab === tb.key ? "bg-[#0F3821] text-white" : "bg-white border border-[#0F3821]/10 text-[#4A5D51]"}`}>
            <tb.icon size={16} weight="duotone" />{tb.label}
          </button>
        ))}
      </div>

      {form && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-[#0F3821]/10 p-6 space-y-4 fade-up" data-testid="crops-form">
          {tab === "crops" && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("crop_type")}><input required className={inputCls} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="crop-name-input" /></Field>
                <Field label="Variety"><input className={inputCls} onChange={(e) => setForm({ ...form, variety: e.target.value })} data-testid="crop-variety-input" /></Field>
                <Field label="Plot / Field"><input className={inputCls} onChange={(e) => setForm({ ...form, plot: e.target.value })} data-testid="crop-plot-input" /></Field>
                <Field label={t("farm_size")}><input type="number" step="0.1" className={inputCls} onChange={(e) => setForm({ ...form, area: parseFloat(e.target.value) || null })} data-testid="crop-area-input" /></Field>
                <Field label="Sowing date"><input type="date" className={inputCls} onChange={(e) => setForm({ ...form, sowing_date: e.target.value })} data-testid="crop-sowing-input" /></Field>
                <Field label={t("crop_stage")}>
                  <select className={inputCls} onChange={(e) => setForm({ ...form, growth_stage: e.target.value })} data-testid="crop-stage-select">
                    {STAGES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <Field label={t("expected_harvest")}><input type="date" className={inputCls} onChange={(e) => setForm({ ...form, expected_harvest_date: e.target.value })} data-testid="crop-harvest-input" /></Field>
              </div>
            </>
          )}
          {tab === "diary" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("category")}>
                <select required className={inputCls} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} defaultValue="" data-testid="diary-type-select">
                  <option value="" disabled>—</option>
                  {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label={t("date")}><input required type="date" className={inputCls} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="diary-date-input" /></Field>
              <Field label={t("note")}><input className={inputCls} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="diary-desc-input" /></Field>
              <Field label={`${t("amount")} (₹, optional)`}><input type="number" className={inputCls} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || null })} data-testid="diary-cost-input" /></Field>
            </div>
          )}
          {tab === "reminders" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Title"><input required className={inputCls} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="reminder-title-input" /></Field>
              <Field label={t("category")}>
                <select className={inputCls} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })} defaultValue="other" data-testid="reminder-type-select">
                  {REMINDER_TYPES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label={t("date")}><input required type="date" className={inputCls} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="reminder-date-input" /></Field>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" className={btnPrimary} data-testid="crops-form-save">{t("save")}</button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-[#7C8D81] px-3" data-testid="crops-form-cancel">{t("cancel")}</button>
          </div>
        </form>
      )}

      {tab === "crops" && (crops === null ? <SkeletonCard /> : crops.length === 0 ? (
        <EmptyState icon={Plant} title={t("no_data")} subtitle="Add your first crop to track its stage, activities and expenses." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-[#0F3821]/10 p-5 card-lift" data-testid={`crop-card-${c.id}`}>
              <div className="flex justify-between items-start">
                <h3 className="font-heading font-semibold capitalize">{c.name}</h3>
                <button onClick={() => del("crops", c.id)} className="text-[#7C8D81] hover:text-[#E63946] transition-colors" data-testid={`crop-delete-${c.id}`} aria-label={t("delete")}><Trash size={16} /></button>
              </div>
              {c.variety && <p className="text-xs text-[#7C8D81]">{c.variety}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge tone="green">{(c.growth_stage || "sowing").replace("_", " ")}</Badge>
                {c.area && <Badge tone="gray">{c.area} {c.area_unit}</Badge>}
              </div>
              <div className="text-xs text-[#4A5D51] mt-3 space-y-0.5">
                {c.sowing_date && <p>Sown: {c.sowing_date}</p>}
                {c.expected_harvest_date && <p>{t("expected_harvest")}: {c.expected_harvest_date}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === "diary" && (diary === null ? <SkeletonCard /> : diary.length === 0 ? (
        <EmptyState icon={Notebook} title={t("no_data")} subtitle="Record sowing, irrigation, fertilizer and other activities here." />
      ) : (
        <ul className="space-y-2">
          {diary.map((d) => (
            <li key={d.id} className="bg-white rounded-xl border border-[#0F3821]/10 p-4 flex items-center justify-between" data-testid={`diary-entry-${d.id}`}>
              <div>
                <p className="font-medium text-sm capitalize">{d.activity_type} · {d.date}</p>
                {d.description && <p className="text-xs text-[#7C8D81]">{d.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                {d.cost && <Badge tone="gold">₹{d.cost}</Badge>}
                <button onClick={() => del("diary", d.id)} className="text-[#7C8D81] hover:text-[#E63946]" data-testid={`diary-delete-${d.id}`} aria-label={t("delete")}><Trash size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      ))}

      {tab === "reminders" && (reminders === null ? <SkeletonCard /> : reminders.length === 0 ? (
        <EmptyState icon={BellRinging} title={t("no_data")} subtitle="Set reminders for irrigation, spraying, harvest and scheme deadlines." />
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li key={r.id} className={`bg-white rounded-xl border border-[#0F3821]/10 p-4 flex items-center justify-between ${r.done ? "opacity-60" : ""}`} data-testid={`reminder-${r.id}`}>
              <button onClick={() => toggleDone(r)} className="flex items-center gap-3 text-left" data-testid={`reminder-toggle-${r.id}`}>
                {r.done ? <CheckCircle size={22} weight="duotone" className="text-[#2D6A4F]" /> : <Circle size={22} className="text-[#7C8D81]" />}
                <div>
                  <p className={`font-medium text-sm ${r.done ? "line-through" : ""}`}>{r.title}</p>
                  <p className="text-xs text-[#7C8D81]">{r.due_date} · {r.reminder_type}</p>
                </div>
              </button>
              <button onClick={() => del("reminders", r.id)} className="text-[#7C8D81] hover:text-[#E63946]" data-testid={`reminder-delete-${r.id}`} aria-label={t("delete")}><Trash size={16} /></button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { PageHeader, inputCls, btnPrimary, Field, Badge, EmptyState, Spinner } from "../components/Shared";
import { Camera, UploadSimple, Warning, ClockCounterClockwise, Scan } from "@phosphor-icons/react";
import { toast } from "sonner";

const CONF_TONE = { high: "green", medium: "gold", low: "gray" };

export default function CropScanner() {
  const { t, lang } = useI18n();
  const [image, setImage] = useState(null);
  const [ctx, setCtx] = useState({ crop_type: "", symptoms: "", growth_stage: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);
  const camRef = useRef(null);

  useEffect(() => { api.get("/ai/scans").then(({ data }) => setHistory(data)).catch(() => {}); }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast.error("Please use a JPEG, PNG or WEBP photo."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL("image/jpeg", 0.85));
        setResult(null);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!image) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await api.post("/ai/scan", {
        image_base64: image.split(",")[1], ...ctx, language: lang,
      });
      setResult(data.result);
      setHistory((h) => [{ id: data.id, crop_type: ctx.crop_type, result: data.result, created_at: data.created_at }, ...h]);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("scan_title")} subtitle={t("scan_disclaimer")} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="bg-white rounded-xl border border-[#0F3821]/10 p-6 space-y-4">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" data-testid="scanner-file-input" />
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="scanner-camera-input" />
          {image ? (
            <img src={image} alt="Crop to analyze" className="w-full max-h-72 object-contain rounded-lg bg-[#F9F6F0]" data-testid="scanner-preview" />
          ) : (
            <div className="border-2 border-dashed border-[#0F3821]/15 rounded-xl p-10 text-center text-[#7C8D81]">
              <Scan size={40} weight="duotone" className="mx-auto mb-3 text-[#8A9A5B]" />
              <p className="text-sm">Photograph leaves, fruits, stems or pests clearly in good light.</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => fileRef.current.click()} className={`${btnPrimary} flex-1`} data-testid="scanner-upload-btn"><UploadSimple size={18} />{t("upload_photo")}</button>
            <button onClick={() => camRef.current.click()} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#0F3821]/20 text-sm font-medium hover:bg-[#F0EBE1] transition-colors" data-testid="scanner-camera-btn"><Camera size={18} />{t("take_photo")}</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("crop_type")}><input className={inputCls} value={ctx.crop_type} onChange={(e) => setCtx({ ...ctx, crop_type: e.target.value })} placeholder="e.g. Tomato" data-testid="scanner-crop-input" /></Field>
            <Field label={t("growth_stage")}><input className={inputCls} value={ctx.growth_stage} onChange={(e) => setCtx({ ...ctx, growth_stage: e.target.value })} placeholder="e.g. flowering" data-testid="scanner-stage-input" /></Field>
          </div>
          <Field label={t("symptoms")}><textarea className={inputCls} rows={2} value={ctx.symptoms} onChange={(e) => setCtx({ ...ctx, symptoms: e.target.value })} placeholder="e.g. yellow spots, curling leaves" data-testid="scanner-symptoms-input" /></Field>
          <button onClick={analyze} disabled={!image || busy} className={`${btnPrimary} w-full py-3`} data-testid="scanner-analyze-btn">
            {busy ? t("loading") : t("analyze")}
          </button>
        </section>

        <section className="space-y-4">
          {busy && <Spinner label={t("loading")} />}
          {result && (
            <div className="bg-white rounded-xl border border-[#0F3821]/10 p-6 space-y-4 fade-up" data-testid="scanner-result">
              <h2 className="font-heading font-semibold text-lg">{t("probable_conditions")}</h2>
              {result.probable_conditions?.length === 0 && <p className="text-sm text-[#4A5D51]">{result.disclaimer_note}</p>}
              {result.probable_conditions?.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#F9F6F0]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <Badge tone={CONF_TONE[c.confidence] || "gray"}>{c.confidence}</Badge>
                  </div>
                  <p className="text-sm text-[#4A5D51] mt-1">{c.description}</p>
                </div>
              ))}
              {result.recommended_actions?.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm mb-1.5">{t("recommended_actions")}</h3>
                  <ul className="list-disc pl-5 text-sm text-[#4A5D51] space-y-1">{result.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              )}
              {result.prevention?.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm mb-1.5">{t("prevention")}</h3>
                  <ul className="list-disc pl-5 text-sm text-[#4A5D51] space-y-1">{result.prevention.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              )}
              {result.expert_consultation_advised && (
                <p className="flex items-start gap-2 text-sm bg-[#E9C46A]/20 text-[#7a5c10] p-3 rounded-lg"><Warning size={17} className="shrink-0 mt-0.5" />{t("consult_expert")}</p>
              )}
              <p className="text-xs text-[#7C8D81]">{t("scan_disclaimer")}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-[#0F3821]/10 p-6" data-testid="scanner-history">
            <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2"><ClockCounterClockwise size={20} weight="duotone" />{t("scan_history")}</h2>
            {history.length === 0 ? <EmptyState icon={Scan} title={t("no_data")} subtitle="Your previous scans will appear here so you can compare outcomes." /> : (
              <ul className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="p-3 rounded-lg bg-[#F9F6F0] text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{h.crop_type || "Crop"} — {h.result?.probable_conditions?.[0]?.name || "No condition identified"}</span>
                      <span className="text-xs text-[#7C8D81]">{h.created_at?.slice(0, 10)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

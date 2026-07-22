import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { API } from "../lib/api";
import { Microphone, X, SpeakerHigh, StopCircle } from "@phosphor-icons/react";
import { Md } from "./Shared";

const NAV_COMMANDS = [
  { keys: ["price", "bhav", "भाव", "मंडी", "mandi", "दाम"], to: "/prices" },
  { keys: ["weather", "rain", "मौसम", "बारिश", "barish"], to: "/weather" },
  { keys: ["scan", "disease", "रोग", "बीमारी", "स्कैन"], to: "/scanner" },
  { keys: ["demand", "buyer", "मांग", "खरीदार", "kharidar"], to: "/demand" },
  { keys: ["market", "sell", "बाज़ार", "बेच"], to: "/market" },
  { keys: ["scheme", "yojana", "योजना"], to: "/schemes" },
  { keys: ["expense", "खर्च", "kharcha"], to: "/expenses" },
  { keys: ["reminder", "रिमाइंडर", "याद"], to: "/crops" },
  { keys: ["home", "dashboard", "होम", "डैशबोर्ड"], to: "/dashboard" },
];

export default function VoiceAssistant() {
  const { t, lang, langMeta } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);

const speak = useCallback((text) => {
  try {
    // Stop anything currently being spoken
    window.speechSynthesis.cancel();

    // Clean Markdown/symbols that should not be spoken
    const cleanText = text
      .replace(/\*\*?/g, "")
      .replace(/#{1,6}\s?/g, "")
      .replace(/[`*_~]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .trim();

    if (!cleanText) return;

    // Split naturally at sentence boundaries.
    // Includes Hindi danda "।"
    const sentences =
      cleanText.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [cleanText];

    // Create smaller chunks for reliable browser speech synthesis
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {
      const next = `${current} ${sentence}`.trim();

      if (next.length > 300 && current) {
        chunks.push(current.trim());
        current = sentence.trim();
      } else {
        current = next;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    // Speak ALL chunks one after another
    const speakChunk = (index) => {
      if (index >= chunks.length) return;

      const utterance = new SpeechSynthesisUtterance(chunks[index]);

      // Uses selected KhetSaarthi language:
      // hi-IN, en-IN, etc.
      utterance.lang = langMeta.speech;

      utterance.onend = () => {
        speakChunk(index + 1);
      };

      utterance.onerror = (event) => {
        // "interrupted" / "canceled" are normal when user presses stop
        if (
          event.error !== "interrupted" &&
          event.error !== "canceled"
        ) {
          console.error(
            "Speech synthesis error:",
            event.error,
            event
          );
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);

  } catch (e) {
    console.error("Speech synthesis failed:", e);
  }
}, [langMeta]);

  const handleQuery = useCallback(async (text) => {
    const lower = text.toLowerCase();
    for (const cmd of NAV_COMMANDS) {
      if (cmd.keys.some((k) => lower.includes(k))) {
        // navigation intent only for short commands like "open weather"
        if (lower.split(" ").length <= 4 && (lower.includes("open") || lower.includes("show") || lower.includes("खोल") || lower.includes("दिखा") || cmd.keys.some(k => lower.trim() === k))) {
          navigate(cmd.to);
          setOpen(false);
          return;
        }
      }
    }
    setBusy(true); setReply("");
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language: lang }),
      });
      if (!res.ok) throw new Error("ai");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6);
            if (chunk.startsWith("[DONE") || chunk === "[ERROR]") continue;
            full += chunk.replaceAll("<|nl|>", "\n");
            setReply(full);
          }
        }
      }
      if (full) speak(full);
    } catch (e) {
      setError(t("error_generic"));
    } finally {
      setBusy(false);
    }
  }, [lang, navigate, speak, t]);

  const startListening = () => {
    setError(""); setTranscript(""); setReply("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError(t("voice_unsupported")); return; }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = langMeta.speech;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        handleQuery(text);
      }
    };
    rec.onerror = (e) => {
      console.error("SpeechRecognition error:", e.error, e);
      setListening(false);

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError(t("mic_denied"));
      } else if (e.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (e.error === "audio-capture") {
        setError("Microphone could not be accessed.");
      } else if (e.error === "network") {
        setError("Browser speech recognition service is unavailable. Try Google Chrome.");
      } else {
        setError(`Voice recognition failed: ${e.error || "unknown error"}`);
      }
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const stopAll = () => {
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
    setListening(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="voice-assistant-fab" aria-label={t("voice_assistant")}
        className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40 w-14 h-14 rounded-full bg-[#0F3821] text-[#D69F39] flex items-center justify-center shadow-xl hover:scale-105 transition-transform pulse-ring relative">
        <Microphone size={26} weight="duotone" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => { stopAll(); setOpen(false); }}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative glass bg-white/90 rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="voice-assistant-panel">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-lg text-[#0F3821]">{t("voice_assistant")}</h3>
              <button onClick={() => { stopAll(); setOpen(false); }} data-testid="voice-close-btn" className="p-2 rounded-full hover:bg-[#F0EBE1]"><X size={20} /></button>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
              <button onClick={listening ? stopAll : startListening} data-testid="voice-mic-btn"
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${listening ? "bg-[#C85A32] text-white pulse-ring relative" : "bg-[#0F3821] text-[#D69F39]"}`}>
                {listening ? <StopCircle size={36} weight="duotone" /> : <Microphone size={36} weight="duotone" />}
              </button>
              <p className="text-sm text-[#4A5D51]" data-testid="voice-status">{listening ? t("listening") : t("voice_hint")}</p>
            </div>
            {transcript && <div className="bg-[#F0EBE1] rounded-lg p-3 text-sm" data-testid="voice-transcript"><strong>»</strong> {transcript}</div>}
            {busy && <div className="skeleton h-4 w-2/3" />}
            {reply && (
              <div className="bg-white border border-[#0F3821]/10 rounded-lg p-3 text-sm max-h-52 overflow-y-auto" data-testid="voice-reply">
                <div className="flex items-center gap-1.5 text-xs text-[#8A9A5B] mb-1"><SpeakerHigh size={14} /> KrishiAI</div>
                <Md text={reply} />
              </div>
            )}
            {error && <p className="text-sm text-[#E63946]" data-testid="voice-error">{error}</p>}
            <p className="text-[11px] text-[#7C8D81]">{t("ai_disclaimer_short")}</p>
          </div>
        </div>
      )}
    </>
  );
}

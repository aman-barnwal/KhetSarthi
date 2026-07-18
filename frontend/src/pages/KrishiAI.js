import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "../lib/i18n";
import { api, API } from "../lib/api";
import { PageHeader, Md } from "../components/Shared";
import { Sparkle, PaperPlaneRight, User } from "@phosphor-icons/react";

const SUGGESTIONS = ["What is the best time to sow wheat?", "टमाटर में पत्ती मुड़ने का कारण क्या है?", "Which schemes help with drip irrigation?", "How to control aphids naturally?"];

export default function KrishiAI() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [configured, setConfigured] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { api.get("/ai/status").then(({ data }) => setConfigured(data.configured)).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId, language: lang }),
      });
      if (!res.ok) throw new Error("ai");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "", buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const chunk = p.slice(6);
          if (chunk.startsWith("[DONE:")) { setSessionId(chunk.slice(6, -1)); continue; }
          if (chunk === "[ERROR]") { full += "\n" + t("error_generic"); }
          else full += chunk.replaceAll("<|nl|>", "\n");
          setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: full }; return c; });
        }
      }
    } catch (e) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: t("error_generic") }; return c; });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)]">
      <PageHeader title={t("krishi_ai")} subtitle={t("ai_disclaimer_short")} />
      {!configured && (
        <div className="bg-[#D69F39]/15 border border-[#D69F39]/40 rounded-xl p-4 text-sm text-[#8a6516] mb-4" data-testid="ai-not-configured">
          KrishiAI needs configuration. Add GEMINI_API_KEY or GROQ_API_KEY on the server to activate it.
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4" data-testid="ai-chat-messages">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-[#0F3821] flex items-center justify-center"><Sparkle size={30} weight="duotone" className="text-[#D69F39]" /></div>
            <p className="text-[#4A5D51] text-sm">{t("type_message")}</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} data-testid={`ai-suggestion-${i}`}
                  className="px-4 py-2 rounded-full bg-white border border-[#0F3821]/10 text-sm text-[#4A5D51] hover:border-[#D69F39] transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-[#0F3821] flex items-center justify-center shrink-0"><Sparkle size={16} weight="duotone" className="text-[#D69F39]" /></div>}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-[#0F3821] text-[#F9F6F0] whitespace-pre-wrap" : "bg-white border border-[#0F3821]/10"}`}>
              {m.role === "assistant" ? (m.content ? <Md text={m.content} /> : <span className="inline-block skeleton h-3 w-24" />) : m.content}
            </div>
            {m.role === "user" && <div className="w-8 h-8 rounded-full bg-[#D69F39] flex items-center justify-center shrink-0"><User size={16} className="text-[#0A170F]" /></div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-3 border-t border-[#0F3821]/10">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("type_message")} data-testid="ai-chat-input"
          className="flex-1 px-4 py-3 rounded-full border border-[#0F3821]/15 bg-white text-sm focus:border-[#D69F39] focus:ring-1 focus:ring-[#D69F39] outline-none" />
        <button type="submit" disabled={busy || !input.trim()} data-testid="ai-chat-send-btn" aria-label="Send"
          className="w-12 h-12 rounded-full bg-[#0F3821] text-[#D69F39] flex items-center justify-center disabled:opacity-40 hover:bg-[#1a4d30] transition-colors">
          <PaperPlaneRight size={20} weight="duotone" />
        </button>
      </form>
    </div>
  );
}

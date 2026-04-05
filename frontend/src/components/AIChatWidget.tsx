"use client";
import { useState, useRef, useEffect } from "react";
import { aiChat } from "@/lib/api";
import { MessageCircle, Send, X } from "lucide-react";

interface Msg { role: "user" | "ai"; text: string }

export default function AIChatWidget({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Привет! Я — AI-ассистент GambleGuard. Готов помочь и ответить на ваши вопросы. 💙" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const data = await aiChat(userId, text);
      setMsgs((m) => [...m, { role: "ai", text: data.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Ошибка соединения с AI. Проверьте GROQ_API_KEY." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition z-50"
      >
        <MessageCircle size={22} />
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 h-[420px] bg-[#13121f] border border-white/10 rounded-2xl flex flex-col shadow-2xl z-50 animate-in">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold flex-1">AI-поддержка</span>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] text-xs leading-relaxed px-3 py-2 rounded-xl whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white/5 text-white/80 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 text-white/40 text-xs px-3 py-2 rounded-xl animate-pulse">
                  AI думает...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 py-3 border-t border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Напишите вопрос..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 placeholder-white/20"
            />
            <button
              onClick={send}
              disabled={loading}
              className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg flex items-center justify-center transition"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

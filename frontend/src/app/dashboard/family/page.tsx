"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { aiFamilyExplain, aiPsychiatristSummary, aiRecoveryPlan } from "@/lib/api";
import { Heart, Stethoscope, MapPin, Zap } from "lucide-react";

const TABS = [
  { id: "family", label: "Для близких", icon: Heart },
  { id: "recovery", label: "План восстановления", icon: MapPin },
  { id: "psychiatrist", label: "Для врача", icon: Stethoscope },
];

export default function FamilyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [tab, setTab] = useState("family");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    if (!id) { router.push("/"); return; }
    setUserId(Number(id));
  }, []);

  const generate = async (type: string) => {
    if (!userId) return;
    setLoading((l) => ({ ...l, [type]: true }));
    try {
      let result = "";
      if (type === "family") result = (await aiFamilyExplain(userId)).explanation;
      if (type === "recovery") result = (await aiRecoveryPlan(userId)).plan;
      if (type === "psychiatrist") result = (await aiPsychiatristSummary(userId)).summary;
      setTexts((t) => ({ ...t, [type]: result }));
    } finally {
      setLoading((l) => ({ ...l, [type]: false }));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-2">AI-поддержка</h1>
      <p className="text-white/40 text-sm mb-6">Персональные AI-объяснения для разных аудиторий</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/3 p-1 rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${
              tab === id ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass rounded-xl p-6">
        {texts[tab] ? (
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{texts[tab]}</p>
        ) : (
          <div className="text-center py-8">
            <p className="text-white/20 text-sm mb-4">
              {tab === "family" && "AI объяснит близким что происходит и как помочь"}
              {tab === "recovery" && "AI составит персональный план восстановления на 30 дней"}
              {tab === "psychiatrist" && "AI сформирует клиническую сводку для специалиста"}
            </p>
            <button
              onClick={() => generate(tab)}
              disabled={loading[tab]}
              className="flex items-center gap-2 mx-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              <Zap size={14} />
              {loading[tab] ? "Генерирую..." : "Сгенерировать AI-текст"}
            </button>
          </div>
        )}

        {texts[tab] && (
          <button
            onClick={() => generate(tab)}
            disabled={loading[tab]}
            className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
          >
            {loading[tab] ? "Обновляю..." : "↻ Обновить"}
          </button>
        )}
      </div>
    </div>
  );
}

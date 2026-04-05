"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeRisk, getRiskProfile, getRiskHistory, aiRiskExplain, predictEscalation, listTransactions } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import AIChatWidget from "@/components/AIChatWidget";
import AIStatusBadge from "@/components/AIStatusBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { RefreshCw, Zap, Brain, TrendingUp, Activity } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [aiText, setAiText] = useState("");
  const [escalation, setEscalation] = useState<any>(null);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    const name = localStorage.getItem("gg_user_name") || "Пользователь";
    if (!id) { router.push("/"); return; }
    const uid = Number(id);
    setUserId(uid);
    setUserName(name);
    loadData(uid);
  }, []);

  const loadData = async (uid: number) => {
    setLoading(true);
    try {
      const [prof, hist, txs] = await Promise.all([
        getRiskProfile(uid),
        getRiskHistory(uid),
        listTransactions(uid),
      ]);
      setProfile(prof);
      setHistory(hist.map((h: any, i: number) => ({ name: `Анализ ${i + 1}`, score: h.score })));
      setTxCount(txs.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!userId) return;
    setAnalyzing(true);
    try {
      const result = await analyzeRisk(userId);
      setProfile(result);
      const hist = await getRiskHistory(userId);
      setHistory(hist.map((h: any, i: number) => ({ name: `#${i + 1}`, score: h.score })));
      const esc = await predictEscalation(userId);
      setEscalation(esc);
    } finally {
      setAnalyzing(false);
    }
  };

  const getAiInsight = async () => {
    if (!userId) return;
    setAiLoading(true);
    setAiText("");
    try {
      const data = await aiRiskExplain(userId);
      setAiText(data.explanation);
    } finally {
      setAiLoading(false);
    }
  };

  const scoreColor = (level: string) => {
    if (level === "CRITICAL") return "#f43f5e";
    if (level === "HIGH") return "#f97316";
    if (level === "MEDIUM") return "#f59e0b";
    return "#22c55e";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white/30 text-sm animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Добро пожаловать, {userName.split(" ")[0]}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-white/40 text-sm">Панель мониторинга рисков</p>
            <AIStatusBadge />
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          <RefreshCw size={14} className={analyzing ? "animate-spin" : ""} />
          {analyzing ? "Анализирую..." : "Запустить анализ"}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Риск-скор", value: profile ? `${profile.score}/100` : "—", sub: profile?.level || "нет данных" },
          { label: "Транзакций", value: txCount, sub: "загружено" },
          { label: "Паттернов", value: profile?.patterns?.length || 0, sub: "сработало" },
          { label: "Эскалация", value: escalation ? `${Math.round(escalation.escalation_probability * 100)}%` : "—", sub: escalation?.verdict || "не рассчитано" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="glass rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Risk profile + chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Risk profile */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Activity size={15} className="text-indigo-400" /> Профиль риска
            </h2>
            {profile && <RiskBadge level={profile.level} score={profile.score} />}
          </div>

          {profile && profile.patterns?.length > 0 ? (
            <div className="space-y-3">
              {profile.patterns.map((p: any) => (
                <div key={p.id} className="bg-white/3 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/80">{p.id}</span>
                    <span className="text-xs text-rose-400 font-bold">+{p.weight}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/20 text-sm">
                {txCount === 0 ? "Загрузите транзакции и запустите анализ" : "Нажмите «Запустить анализ»"}
              </p>
            </div>
          )}
        </div>

        {/* History chart */}
        <div className="glass rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-400" /> История риск-скора
          </h2>
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1a1828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1", strokeWidth: 0, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">
              Нужно минимум 2 анализа для графика
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Brain size={15} className="text-indigo-400" /> AI-объяснение риска
          </h2>
          <button
            onClick={getAiInsight}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            <Zap size={12} />
            {aiLoading ? "Генерирую..." : "Получить AI-инсайт"}
          </button>
        </div>
        {aiText ? (
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{aiText}</p>
        ) : (
          <p className="text-white/20 text-sm text-center py-4">
            Нажмите «Получить AI-инсайт» для персонального анализа от Llama 3
          </p>
        )}
      </div>

      {userId && <AIChatWidget userId={userId} />}
    </div>
  );
}

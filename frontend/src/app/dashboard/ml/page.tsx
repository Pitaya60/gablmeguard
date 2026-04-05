"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { predictEscalation } from "@/lib/api";
import { Brain, BarChart2, RefreshCw } from "lucide-react";

const FEATURE_LABELS: Record<string, string> = {
  gambling_share:   "Доля расходов на gambling",
  night_ratio:      "Ночная активность (23:00–05:00)",
  max_per_day_norm: "Макс. ставок в день",
  credit_bet_ratio: "Кредит → ставка",
  amount_trend:     "Тренд роста сумм",
  frequency_norm:   "Частота gambling",
  avg_amount_ratio: "Средняя ставка / средний чек",
  unique_days_norm: "Дней с gambling / 30",
};

export default function MLPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    if (!id) { router.push("/"); return; }
    const uid = Number(id);
    setUserId(uid);
    load(uid);
  }, []);

  const load = async (uid: number) => {
    setLoading(true);
    try { setResult(await predictEscalation(uid)); }
    finally { setLoading(false); }
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const colorClass = (c: string) => ({
    LOW:      "text-green-400 bg-green-500/10 border-green-500/20",
    MEDIUM:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
    HIGH:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
    CRITICAL: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  }[c] || "text-white/50 bg-white/5 border-white/10");

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-indigo-400" size={22} /> ML-предсказание эскалации
        </h1>
        <button onClick={() => userId && load(userId)} disabled={loading}
          className="flex items-center gap-2 text-xs border border-white/10 hover:bg-white/5 text-white/50 hover:text-white px-3 py-2 rounded-lg transition">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Обновить
        </button>
      </div>
      <p className="text-white/40 text-sm mb-8">
        GradientBoostingClassifier · 8 признаков · ROC-AUC 0.878 · sklearn Pipeline
      </p>

      {loading && !result && (
        <div className="glass rounded-xl p-8 text-center text-white/30 text-sm animate-pulse">
          Модель вычисляет предсказание...
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className={`rounded-xl p-6 border ${colorClass(result.color)}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Риск эскалации за 30 дней</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass(result.color)}`}>{result.verdict}</span>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-5xl font-bold">{Math.round(result.escalation_probability * 100)}%</span>
              <span className="text-sm opacity-60">вероятность</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">{result.advice}</p>
          </div>

          <div className="glass rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-indigo-400" /> Важность признаков (GBM feature importances)
            </h2>
            <div className="space-y-4">
              {Object.entries(result.feature_importances as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([name, importance]) => {
                  const value = result.feature_values?.[name] ?? 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/60">{FEATURE_LABELS[name] || name}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-white/30">значение: <span className="text-white/50">{pct(value)}</span></span>
                          <span className="text-indigo-400 font-mono font-bold w-10 text-right">{pct(importance)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-indigo-500/50 rounded-full transition-all" style={{ width: pct(importance) }} />
                        <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: pct(Math.min(value, 1)), opacity: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
            </div>
            <p className="text-xs text-white/20 mt-4">
              Синяя — важность признака в GBM-модели. Белая — значение признака у данного пользователя.
            </p>
          </div>

          <div className="glass rounded-xl p-4 flex flex-wrap gap-4 text-xs text-white/30">
            <span>Модель: <span className="text-white/50">{result.model_info?.type}</span></span>
            <span>Признаков: <span className="text-white/50">{result.model_info?.n_features}</span></span>
            <span>ROC-AUC: <span className="text-white/50">0.878</span></span>
            <span>Обучена на: <span className="text-white/50">3000 синтетических записях</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

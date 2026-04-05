"use client";
import { useEffect, useState } from "react";
import { getAnalystUsers, getAnalystStats } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function AnalystPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalystUsers(), getAnalystStats()]).then(([u, s]) => {
      setUsers(u);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const levelColors: Record<string, string> = {
    LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#f43f5e",
  };

  const chartData = stats
    ? Object.entries(stats.by_level).map(([level, count]) => ({ level, count, fill: levelColors[level] }))
    : [];

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/30 text-sm animate-pulse">Загрузка...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Панель аналитика</h1>
          <p className="text-white/40 text-sm mt-1">Агрегированная картина рисков по всем пользователям</p>
        </div>
        <a
          href="http://localhost:8000/api/analyst/export"
          className="flex items-center gap-2 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white text-sm px-4 py-2 rounded-lg transition"
        >
          <Download size={14} /> Экспорт CSV
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: "Всего пользователей", value: stats.total_users, color: "text-indigo-400" },
            { icon: TrendingUp, label: "Средний скор", value: `${stats.avg_risk_score}/100`, color: "text-amber-400" },
            { icon: AlertTriangle, label: "Критических", value: stats.by_level.CRITICAL, color: "text-rose-400" },
            { icon: AlertTriangle, label: "Высокий риск", value: stats.by_level.HIGH, color: "text-orange-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-xl p-4">
              <Icon className={`${color} mb-2`} size={18} />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-4">Распределение по уровням риска</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="level" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1a1828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Users table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="font-semibold text-sm">Все пользователи</h2>
        </div>
        <div className="divide-y divide-white/5">
          {users.map((u) => (
            <div key={u.user_id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/2 transition">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-300">
                {(u.name || u.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-white/30 truncate">{u.email}</p>
              </div>
              <div className="text-xs text-white/30">{u.tx_count} тр.</div>
              <RiskBadge level={u.risk_level} score={u.risk_score} />
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-8 text-center text-white/20 text-sm">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  );
}

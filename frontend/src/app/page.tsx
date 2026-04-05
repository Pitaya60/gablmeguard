"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { Shield, TrendingUp, Users, Brain } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await login(email.trim(), name.trim() || "Пользователь");
      localStorage.setItem("gg_user_id", String(data.user_id));
      localStorage.setItem("gg_user_name", data.name);
      localStorage.setItem("gg_user_email", data.email);
      router.push("/dashboard");
    } catch {
      setError("Ошибка подключения к серверу. Убедитесь, что бэкенд запущен.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    setEmail(email);
    setLoading(true);
    try {
      const data = await login(email, email.split("@")[0]);
      localStorage.setItem("gg_user_id", String(data.user_id));
      localStorage.setItem("gg_user_name", data.name);
      localStorage.setItem("gg_user_email", data.email);
      router.push("/dashboard");
    } catch {
      setError("Ошибка подключения к серверу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0e17] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Shield className="text-indigo-400" size={24} />
        <span className="font-bold text-lg tracking-tight">GambleGuard</span>
        <span className="ml-auto text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          AI for Government · Казахстан 2025
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-4xl w-full text-center mb-12 animate-in">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm px-4 py-1.5 rounded-full mb-6">
            <Brain size={14} /> AI-платформа раннего выявления игровой зависимости
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Защита до того,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
              как стало поздно
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            GambleGuard анализирует финансовые транзакции, выявляет паттерны игровой зависимости
            и запускает защитные механизмы — для граждан, их близких и государственных аналитиков.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-12 animate-in" style={{ animationDelay: "0.1s" }}>
          {[
            { icon: TrendingUp, title: "Rule-based scoring", desc: "5 поведенческих паттернов с весами и объяснениями" },
            { icon: Brain, title: "AI-инсайты", desc: "Llama 3 генерирует персональные объяснения и планы" },
            { icon: Users, title: "Trusted Circle", desc: "SOS-уведомления близким и панель аналитика" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-5 text-left">
              <Icon className="text-indigo-400 mb-3" size={20} />
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Login form */}
        <div className="w-full max-w-md animate-in" style={{ animationDelay: "0.2s" }}>
          <div className="glass rounded-2xl p-8">
            <h2 className="font-bold text-xl mb-6 text-center">Войти в платформу</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 transition placeholder-white/20"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Имя (опционально)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 transition placeholder-white/20"
                />
              </div>
              {error && <p className="text-rose-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition text-sm"
              >
                {loading ? "Входим..." : "Войти →"}
              </button>
            </form>

            {/* Quick logins */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/30 text-center mb-3">Тестовые аккаунты</p>
              <div className="space-y-2">
                {[
                  { email: "asel@test.kz", label: "Асель — CRITICAL риск", color: "rose" },
                  { email: "daniyar@test.kz", label: "Данияр — MEDIUM риск", color: "amber" },
                  { email: "aigerim@test.kz", label: "Айгерим — LOW риск", color: "green" },
                ].map(({ email, label, color }) => (
                  <button
                    key={email}
                    onClick={() => quickLogin(email)}
                    disabled={loading}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-xs transition flex items-center justify-between
                      ${color === "rose" ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300" : ""}
                      ${color === "amber" ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300" : ""}
                      ${color === "green" ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-300" : ""}
                    `}
                  >
                    <span>{label}</span>
                    <span className="opacity-50">{email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-white/20 mt-4">
            Аккаунт создаётся автоматически при первом входе
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LayoutDashboard, Upload, Users, AlertTriangle, BarChart3, LogOut, Heart, Brain } from "lucide-react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Дашборд" },
  { href: "/dashboard/upload", icon: Upload, label: "Загрузить данные" },
  { href: "/dashboard/ml", icon: Brain, label: "ML Эскалация" },
  { href: "/dashboard/circle", icon: Users, label: "Trusted Circle" },
  { href: "/dashboard/sos", icon: AlertTriangle, label: "SOS" },
  { href: "/dashboard/family", icon: Heart, label: "AI Поддержка" },
  { href: "/dashboard/analyst", icon: BarChart3, label: "Аналитик" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <aside className="w-60 min-h-screen bg-[#0a0919] border-r border-white/8 flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/8">
        <Shield className="text-indigo-400" size={20} />
        <span className="font-bold text-sm tracking-tight">GambleGuard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}

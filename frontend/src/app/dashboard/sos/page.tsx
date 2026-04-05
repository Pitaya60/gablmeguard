"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { triggerSOS, getContacts } from "@/lib/api";
import { AlertTriangle, Phone, CheckCircle } from "lucide-react";

export default function SOSPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [triggered, setTriggered] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    if (!id) { router.push("/"); return; }
    const uid = Number(id);
    setUserId(uid);
    getContacts(uid).then(setContacts);
  }, []);

  const doSOS = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await triggerSOS(userId);
      setResult(res);
      setTriggered(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-2 text-rose-400">SOS — Экстренная помощь</h1>
      <p className="text-white/40 text-sm mb-8">
        Если вы чувствуете, что теряете контроль — нажмите кнопку. Ваши близкие будут оповещены.
      </p>

      {/* Hotlines */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Phone size={15} className="text-rose-400" /> Горячие линии Казахстана
        </h2>
        <div className="space-y-2">
          {[
            { name: "Телефон доверия (психологическая помощь)", number: "150" },
            { name: "Психологическая помощь МЗ РК", number: "8-800-080-8833" },
            { name: "Кризисный центр", number: "109" },
          ].map(({ name, number }) => (
            <div key={number} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-white/50">{name}</span>
              <a href={`tel:${number}`} className="text-sm font-bold text-rose-400 hover:text-rose-300 transition">
                {number}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Trusted contacts preview */}
      {contacts.length > 0 && (
        <div className="glass rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">Будут оповещены</h2>
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                  {c.name[0]}
                </div>
                <span className="text-white/70">{c.name}</span>
                <span className="text-white/30 text-xs">{c.phone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS button */}
      {!triggered ? (
        <button
          onClick={doSOS}
          disabled={loading}
          className="w-full py-6 text-xl font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-2xl transition shadow-lg shadow-rose-500/20 flex items-center justify-center gap-3"
        >
          <AlertTriangle size={24} />
          {loading ? "Отправляю сигнал..." : "АКТИВИРОВАТЬ SOS"}
        </button>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={36} />
          <p className="text-green-300 font-bold text-lg">Сигнал отправлен</p>
          <p className="text-white/50 text-sm mt-2">{result?.message}</p>
          <p className="text-white/30 text-xs mt-1">Риск-скор: {result?.score}/100</p>
        </div>
      )}

      {contacts.length === 0 && (
        <p className="text-center text-white/30 text-xs mt-4">
          Добавьте доверенные контакты в{" "}
          <a href="/dashboard/circle" className="text-indigo-400 hover:underline">Trusted Circle</a>
        </p>
      )}
    </div>
  );
}

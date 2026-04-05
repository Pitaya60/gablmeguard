"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Zap, ZapOff } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AIStatusBadge() {
  const [status, setStatus] = useState<{ groq_configured: boolean; message: string } | null>(null);

  useEffect(() => {
    axios.get(`${BASE}/api/ai/status`)
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ groq_configured: false, message: "Бэкенд недоступен" }));
  }, []);

  if (!status) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
      status.groq_configured
        ? "bg-green-500/10 border-green-500/20 text-green-400"
        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
    }`}>
      {status.groq_configured
        ? <><Zap size={11} /> Llama 3.1 активен</>
        : <><ZapOff size={11} /> Rule-based режим</>
      }
    </div>
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadTransactions, analyzeRisk } from "@/lib/api";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("gg_user_id");
    if (!id) { router.push("/"); return; }
    setUserId(Number(id));
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(json|csv)$/i)) {
      setStatus("error");
      setMessage("Только CSV или JSON файлы");
      return;
    }
    setFile(f);
    setStatus("idle");
    setMessage("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const doUpload = async () => {
    if (!file || !userId) return;
    setStatus("uploading");
    try {
      const res = await uploadTransactions(userId, file);
      setMessage(`✅ Загружено ${res.added} транзакций`);
      setStatus("analyzing");
      const risk = await analyzeRisk(userId);
      setStatus("done");
      setMessage(`✅ Загружено ${res.added} транзакций. Риск: ${risk.level} (${risk.score}/100)`);
    } catch (e: any) {
      setStatus("error");
      setMessage("Ошибка загрузки. Проверьте формат файла.");
    }
  };

  const SAMPLE_JSON = JSON.stringify([
    { date: "2024-11-01T22:30:00", amount: 15000, merchant: "1xBet KZ", mcc: "7995", is_credit: false },
    { date: "2024-11-02T01:15:00", amount: 20000, merchant: "Olimp Bet", mcc: "7995", is_credit: true },
    { date: "2024-11-02T14:00:00", amount: 5000, merchant: "Магнум", is_credit: false },
    { date: "2024-11-03T23:45:00", amount: 30000, merchant: "Fonbet", mcc: "7995", is_credit: false },
    { date: "2024-11-04T02:00:00", amount: 45000, merchant: "Melbet", mcc: "7995", is_credit: true },
  ], null, 2);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_JSON], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "demo_transactions.json";
    a.click();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-2">Загрузить транзакции</h1>
      <p className="text-white/40 text-sm mb-8">Поддерживаются CSV и JSON файлы банковских выписок</p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer mb-6 ${
          dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : file
            ? "border-green-500/40 bg-green-500/5"
            : "border-white/10 hover:border-white/20 bg-white/2"
        }`}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".json,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div>
            <FileText className="mx-auto text-green-400 mb-3" size={36} />
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-white/40 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto text-white/20 mb-3" size={36} />
            <p className="text-white/50 font-medium">Перетащите файл или нажмите</p>
            <p className="text-white/25 text-sm mt-1">CSV или JSON, до 10 МБ</p>
          </div>
        )}
      </div>

      {/* Status */}
      {message && (
        <div className={`flex items-center gap-2 mb-4 p-4 rounded-xl text-sm ${
          status === "error" ? "bg-rose-500/10 border border-rose-500/20 text-rose-300" : "bg-green-500/10 border border-green-500/20 text-green-300"
        }`}>
          {status === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message}
        </div>
      )}

      <button
        onClick={doUpload}
        disabled={!file || status === "uploading" || status === "analyzing"}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition mb-6"
      >
        {status === "uploading" ? "Загружаю..." : status === "analyzing" ? "Анализирую риски..." : "Загрузить и анализировать"}
      </button>

      {status === "done" && (
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 py-3 rounded-xl text-sm transition mb-6"
        >
          Перейти на дашборд →
        </button>
      )}

      {/* Format guide */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Формат JSON</h3>
          <button onClick={downloadSample} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            ↓ Скачать пример
          </button>
        </div>
        <pre className="text-xs text-white/50 leading-relaxed overflow-x-auto bg-black/20 rounded-lg p-3">
          {SAMPLE_JSON}
        </pre>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/30">
          <div><span className="text-white/50">date</span> — ISO datetime</div>
          <div><span className="text-white/50">amount</span> — сумма в тенге</div>
          <div><span className="text-white/50">merchant</span> — название мерчанта</div>
          <div><span className="text-white/50">mcc</span> — код категории (7995 = gambling)</div>
          <div><span className="text-white/50">is_credit</span> — кредитная операция</div>
        </div>
      </div>
    </div>
  );
}

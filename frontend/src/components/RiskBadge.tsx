export default function RiskBadge({ level, score }: { level: string; score?: number }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    LOW:      { bg: "bg-green-500/10 border-green-500/20",  text: "text-green-400",  label: "Низкий" },
    MEDIUM:   { bg: "bg-amber-500/10 border-amber-500/20",  text: "text-amber-400",  label: "Средний" },
    HIGH:     { bg: "bg-orange-500/10 border-orange-500/20",text: "text-orange-400", label: "Высокий" },
    CRITICAL: { bg: "bg-rose-500/10 border-rose-500/20",    text: "text-rose-400",   label: "Критический" },
  };
  const c = cfg[level] || cfg.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace("text-", "bg-")}`} />
      {c.label}{score !== undefined ? ` · ${score}/100` : ""}
    </span>
  );
}

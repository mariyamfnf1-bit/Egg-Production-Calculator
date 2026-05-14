import { useState, useCallback, useRef } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";
import html2canvas from "html2canvas";

const EGG_CATEGORIES = [
  { id: "small",       label: "Small Egg",      dot: "#F59E0B" },
  { id: "normal",      label: "Normal Egg",      dot: "#22C55E" },
  { id: "crack",       label: "Crack Egg",       dot: "#FB7185" },
  { id: "dirty",       label: "Dirty Egg",       dot: "#FB923C" },
  { id: "double_yolk", label: "Double Yolk Egg", dot: "#A78BFA" },
  { id: "brown",       label: "Brown Egg",       dot: "#92400E" },
  { id: "liquid",      label: "Liquid Egg",      dot: "#60A5FA" },
] as const;

type CatId = (typeof EGG_CATEGORIES)[number]["id"];
type Entry = { cartons: string; trays: string };

const EGGS_PER_TRAY    = 30;
const TRAYS_PER_CARTON = 12;
const EGGS_PER_CARTON  = EGGS_PER_TRAY * TRAYS_PER_CARTON; // 360

function toNum(s: string) {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function calcTotals(entries: Record<CatId, Entry>) {
  let totalEggs = 0;
  for (const e of Object.values(entries))
    totalEggs += toNum(e.cartons) * EGGS_PER_CARTON + toNum(e.trays) * EGGS_PER_TRAY;
  const totalTrays  = Math.floor(totalEggs / EGGS_PER_TRAY);
  const remainEggs  = totalEggs % EGGS_PER_TRAY;
  const cartons     = Math.floor(totalTrays / TRAYS_PER_CARTON);
  const remainTrays = totalTrays % TRAYS_PER_CARTON;
  return { totalEggs, totalTrays, cartons, remainTrays, remainEggs };
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const initEntries = (): Record<CatId, Entry> =>
  Object.fromEntries(EGG_CATEGORIES.map(c => [c.id, { cartons: "", trays: "" }])) as Record<CatId, Entry>;

function EggCalculator() {
  const reportRef  = useRef<HTMLDivElement>(null);
  const [farmName, setFarmName] = useState("My Farm");
  const [date,     setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [entries,  setEntries]  = useState<Record<CatId, Entry>>(initEntries);
  const [sharing,  setSharing]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  const update = useCallback((id: CatId, field: "cartons" | "trays", val: string) => {
    setEntries(prev => ({ ...prev, [id]: { ...prev[id], [field]: val.replace(/[^0-9]/g, "") } }));
  }, []);

  const reset = useCallback(() => { setEntries(initEntries()); }, []);

  const shareImage = useCallback(async () => {
    if (!reportRef.current) return;
    setSharing(true);
    setSaved(false);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#FFFBF0" });
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("no blob");

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "egg-report.png", { type: "image/png" })] })) {
        await navigator.share({ files: [new File([blob], "egg-report.png", { type: "image/png" })], title: `${farmName} – Egg Report` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "egg-production-report.png"; a.click();
        URL.revokeObjectURL(url);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* user cancelled or error */ }
    finally { setSharing(false); }
  }, [farmName]);

  const totals  = calcTotals(entries);
  const dateObj = new Date(date + "T00:00:00");

  return (
    <div className="min-h-screen bg-[#FFFBF0] flex flex-col items-center py-6 px-3">

      {/* Report card (captured) */}
      <div ref={reportRef} className="w-full max-w-lg bg-[#FFFBF0] rounded-2xl overflow-hidden shadow-lg">

        {/* Header */}
        <div className="bg-[#7C2D12] px-5 py-4 flex items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-widest text-[rgba(254,243,199,0.6)] mb-1">FARM NAME</p>
            <input
              className="bg-transparent text-[#FEF3C7] text-xl font-bold w-full border-b border-[rgba(254,243,199,0.3)] outline-none placeholder:text-[rgba(254,243,199,0.4)] truncate"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
              placeholder="Enter farm name"
              maxLength={40}
            />
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold tracking-widest text-[rgba(254,243,199,0.6)] mb-1">DATE</p>
            <input
              type="date"
              className="bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.25)] text-[#FEF3C7] text-sm font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Unit info bar */}
        <div className="bg-[#FEF3C7] px-5 py-2 flex items-center justify-around text-center border-b border-[#FDE68A]">
          {[["1 Tray", "30 Eggs"], ["1 Carton", "360 Eggs"], ["12 Trays", "1 Carton"]].map(([lbl, val], i) => (
            <div key={i} className="flex-1 px-2">
              <p className="text-[10px] font-semibold text-[#92400E] opacity-70">{lbl}</p>
              <p className="text-xs font-bold text-[#78350F]">{val}</p>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-[#FEF3C7] border-b border-[#FDE68A]">
          <span className="text-[11px] font-semibold text-[#92400E] tracking-wide uppercase">Category</span>
          <span className="text-[11px] font-semibold text-[#92400E] tracking-wide uppercase text-center">Cartons</span>
          <span className="text-[11px] font-semibold text-[#92400E] tracking-wide uppercase text-center">Trays</span>
        </div>

        {/* Category rows */}
        <div className="divide-y divide-[#FEF3C7]">
          {EGG_CATEGORIES.map(cat => (
            <div key={cat.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.dot }} />
                <span className="text-sm font-medium text-[#1C1917] truncate">{cat.label}</span>
              </div>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                placeholder="0"
                value={entries[cat.id].cartons}
                onChange={e => update(cat.id, "cartons", e.target.value)}
                className="h-9 rounded-lg border-[1.5px] text-center text-base font-semibold text-[#1C1917] bg-white outline-none focus:ring-2 focus:ring-[#F59E0B] transition"
                style={{ borderColor: cat.dot + "80" }}
                maxLength={5}
              />
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                placeholder="0"
                value={entries[cat.id].trays}
                onChange={e => update(cat.id, "trays", e.target.value)}
                className="h-9 rounded-lg border-[1.5px] text-center text-base font-semibold text-[#1C1917] bg-white outline-none focus:ring-2 focus:ring-[#F59E0B] transition"
                style={{ borderColor: cat.dot + "80" }}
                maxLength={5}
              />
            </div>
          ))}
        </div>

        {/* Grand Total */}
        <div className="bg-[#7C2D12] px-5 pt-4 pb-5">
          <p className="text-[10px] font-semibold tracking-widest text-[#FDE68A] mb-3">GRAND TOTAL</p>

          {/* Totals row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[["Total Eggs", totals.totalEggs.toLocaleString()], ["Total Trays", totals.totalTrays.toLocaleString()]].map(([lbl, val]) => (
              <div key={lbl} className="bg-[rgba(255,255,255,0.12)] rounded-xl py-2.5 text-center">
                <p className="text-[10px] text-[rgba(254,243,199,0.7)] uppercase tracking-wide">{lbl}</p>
                <p className="text-2xl font-bold text-[#FEF3C7]">{val}</p>
              </div>
            ))}
          </div>

          {/* Result boxes */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <ResultBox value={totals.cartons}     label="Cartons" />
            <span className="text-[rgba(254,243,199,0.4)] text-xl">+</span>
            <ResultBox value={totals.remainTrays} label="Trays" />
            {totals.remainEggs > 0 && (
              <>
                <span className="text-[rgba(254,243,199,0.4)] text-xl">+</span>
                <ResultBox value={totals.remainEggs} label="Eggs" />
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-[rgba(254,243,199,0.5)]">
            {totals.cartons} Carton{totals.cartons !== 1 ? "s" : ""} + {totals.remainTrays} Tray{totals.remainTrays !== 1 ? "s" : ""}
            {totals.remainEggs > 0 ? ` + ${totals.remainEggs} Egg${totals.remainEggs !== 1 ? "s" : ""}` : ""}
          </p>

          <p className="text-center text-[10px] text-[rgba(254,243,199,0.35)] mt-1">
            {farmName}  ·  {fmtDate(dateObj)}
          </p>
        </div>
      </div>

      {/* Action buttons (outside report = not captured) */}
      <div className="w-full max-w-lg mt-4 flex gap-3">
        <button
          onClick={reset}
          className="flex-1 py-2.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#7C2D12] font-semibold text-sm hover:bg-[#FDE68A] transition"
        >
          ↺ Reset
        </button>
        <button
          onClick={shareImage}
          disabled={sharing}
          className="flex-[2] py-2.5 rounded-xl bg-[#7C2D12] text-[#FEF3C7] font-bold text-sm hover:bg-[#92400E] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {sharing ? (
            <><span className="animate-spin">⏳</span> Capturing…</>
          ) : saved ? (
            <><span>✅</span> Saved!</>
          ) : (
            <><span>📸</span> Share as Image</>
          )}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-[#A8A29E]">
        Open in any browser · No app required
      </p>
    </div>
  );
}

function ResultBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-[rgba(255,255,255,0.14)] rounded-xl px-4 py-2 text-center min-w-[72px]">
      <p className="text-3xl font-bold text-[#FEF3C7] leading-tight">{value}</p>
      <p className="text-[10px] text-[rgba(254,243,199,0.7)]">{label}</p>
    </div>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={EggCalculator} />
      </Switch>
    </WouterRouter>
  );
}

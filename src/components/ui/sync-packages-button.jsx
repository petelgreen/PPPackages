import { useState, useRef, useEffect } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";

const SYNC_OPTIONS = [
  { id: "israel-post", label: "Israel Post", emoji: "📮", description: "Track via Israel Post" },
];

export function SyncPackagesButton({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          group relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold min-h-[44px]
          bg-gradient-to-br from-blue-500/20 to-indigo-500/10
          border border-blue-400/20 hover:border-blue-400/50
          text-blue-300 hover:text-white
          shadow-[0_0_0_0_rgba(99,102,241,0)] hover:shadow-[0_0_16px_2px_rgba(99,102,241,0.15)]
          transition-all duration-300
          ${open ? "border-blue-400/50 text-white shadow-[0_0_16px_2px_rgba(99,102,241,0.15)]" : ""}
        `}
      >
        <RefreshCw
          size={14}
          strokeWidth={2.5}
          className={`transition-transform duration-500 ${open ? "rotate-180" : "group-hover:rotate-90"}`}
        />
        <span className="hidden sm:inline">Sync</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <div
        className={`
          absolute right-0 mt-2 w-52 z-50
          transition-all duration-200 origin-top-right
          ${open ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"}
        `}
      >
        {/* Glass card */}
        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sync from</p>
          </div>
          <div className="p-1.5 flex flex-col gap-0.5">
            {SYNC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setOpen(false);
                  onSelect(opt.id);
                }}
                className="
                  group/item w-full flex items-center gap-3 px-2.5 py-2 rounded-xl
                  hover:bg-white/8 active:bg-white/12
                  transition-colors duration-150 text-left
                "
              >
                <span className="text-base leading-none">{opt.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover/item:text-white transition-colors">{opt.label}</p>
                  <p className="text-[11px] text-slate-500">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

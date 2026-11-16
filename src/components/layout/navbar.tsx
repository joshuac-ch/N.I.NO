
import {
  Radio,
  Volume2,
  VolumeX,
  ShieldAlert,
  UserRound,
  ChevronDown,
  Satellite,
} from "lucide-react";

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
  missionStatus?: string;
  onAbort?: () => void;
}

const tabs = [
  { id: "supervision", label: "Consola de supervisión" },
  { id: "planning", label: "Ruta y planificación" },
  { id: "analysis", label: "Análisis de terreno" },
];

export default function Navbar({
  activeTab = "supervision",
  onTabChange,
  missionStatus = "NOMINAL",
  onAbort,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[76px] w-full items-center justify-between border-b border-white/[0.08] bg-[#151e29]/95 px-5 backdrop-blur-xl">

      {/* Left: Console identity */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
          <Satellite size={18} className="text-cyan-400" />
        </div>

        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-white">
            JEZERO CRATER
          </p>
          <p className="mt-1 text-[9px] tracking-[0.15em] text-slate-500">
            MARS EXPLORATION DIVISION
          </p>
        </div>
      </div>

      {/* Center: Main navigation */}
      <nav className="mx-6 flex h-full flex-1 items-center justify-center gap-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative flex h-full items-center px-4 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                active
                  ? "text-cyan-300"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              {tab.label}

              {active && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Mission controls */}
      <div className="flex shrink-0 items-center gap-2">

        {/* Mission status */}
        <div className="hidden items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <div>
            <p className="text-[9px] font-bold text-emerald-300">
              MISSION STATUS
            </p>
            <p className="text-[9px] text-slate-400">
              {missionStatus}
            </p>
          </div>
        </div>

        {/* Communication */}
        <button
          title="Comunicaciones PTT"
          className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-slate-300 transition hover:bg-white/[0.08]"
        >
          <Radio size={15} />
          <span className="hidden text-[9px] font-bold sm:inline">
            PTT
          </span>
        </button>

        {/* Audio */}
        <button
          title="Audio"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:text-white"
        >
          <Volume2 size={16} />
        </button>

        {/* Abort EVA */}
        <button
          onClick={onAbort}
          className="flex h-9 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.10] px-3 text-red-400 transition hover:border-red-500/40 hover:bg-red-500/20"
        >
          <ShieldAlert size={15} />
          <span className="hidden text-[9px] font-bold tracking-wider lg:inline">
            ABORT EVA
          </span>
        </button>

        {/* User */}
        <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-slate-300 hover:bg-white/10">
          <UserRound size={16} />
        </button>

      </div>
    </header>
  );
}

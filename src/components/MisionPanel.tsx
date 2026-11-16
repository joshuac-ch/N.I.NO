
import {
  Activity,
  Layers3,
  Mountain,
  Route,
  Undo2,
  Trash2,
  Bot,
  ChevronDown,
  ChevronUp,
  Navigation,
  Crosshair,
  Gauge,
  MapPin,
  Clock3,
  Droplets,
  AlertTriangle,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import { useState } from "react";

interface Layer {
  id: string;
  label: string;
}

interface Risk {
  name: string;
  color: string;
}

interface HoverData {
  elev: number;
  slope: number;
}

interface RouteResult {
  verdict: string;
  distance: number;
  gain: number;
  loss: number;
  maxSlope: number;
  hoursOut: number;
  hoursBack: number;
  o2Pct: number;
  fractions: number[];
  samples: unknown[];
}

interface Brief {
  status: "idle" | "loading" | "error" | "done";
  text: string;
}

interface MissionPanelProps {
  layers: Layer[];
  risk: Risk[];

  showRover: boolean;
  onShowRoverChange: (value: boolean) => void;

  vis: Record<string, boolean>;
  onVisibilityChange: (id: string, value: boolean) => void;

  op: Record<string, number>;
  onOpacityChange: (id: string, value: number) => void;

  hover: HoverData | null;

  riskOf: (slope: number) => { name: string };

  pointCount: number;
  onUndo: () => void;
  onClear: () => void;

  result: RouteResult | null;

  auto: boolean;
  onAutoChange: (value: boolean) => void;

  brief: Brief;
  onExplain: () => void;

  profile?: React.ReactNode;
}

export default function MissionPanel({
  layers,
  risk,
  showRover,
  onShowRoverChange,
  vis,
  onVisibilityChange,
  op,
  onOpacityChange,
  hover,
  riskOf,
  pointCount,
  onUndo,
  onClear,
  result,
  auto,
  onAutoChange,
  brief,
  onExplain,
  profile,
}: MissionPanelProps) {

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const SectionTitle = ({
    title,
    icon: Icon,
    id,
  }: {
    title: string;
    icon: React.ElementType;
    id: string;
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex w-full items-center justify-between py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-cyan-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
          {title}
        </span>
      </div>

      {collapsed[id] ? (
        <ChevronDown size={14} className="text-slate-500" />
      ) : (
        <ChevronUp size={14} className="text-slate-500" />
      )}
    </button>
  );

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-white/[0.08] bg-[#111923] text-slate-300">

      {/* HEADER */}
      <div className="border-b border-white/[0.08] px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="text-[9px] font-bold tracking-[0.17em] text-cyan-400">
                MISSION PLANNER
              </span>
            </div>

            <h2 className="mt-2 text-base font-bold tracking-tight text-white">
              Mars EVA Planner
            </h2>

            <p className="mt-1 text-[10px] text-slate-500">
              Jezero Crater · HiRISE 3 m/px
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
            <Navigation size={19} className="text-cyan-400" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2">
          <span className="text-[9px] font-medium tracking-wider text-slate-500">
            TERRAIN ANALYSIS
          </span>
          <span className="text-[9px] font-bold text-emerald-400">
            READY
          </span>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-5">

        {/* ROVER */}
        <section className="border-b border-white/[0.07] pb-4">
          <SectionTitle title="Rover tracking" icon={Activity} id="rover" />

          {!collapsed.rover && (
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] p-3 transition hover:bg-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                  <Crosshair size={15} className="text-cyan-400" />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-200">
                    Perseverance Rover
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    Real rover trajectory
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={showRover}
                onChange={(e) => onShowRoverChange(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          )}
        </section>

        {/* LAYERS */}
        <section className="border-b border-white/[0.07] pb-4">
          <SectionTitle title="Geospatial layers" icon={Layers3} id="layers" />

          {!collapsed.layers && (
            <div className="space-y-3">
              {layers.map((layer) => (
                <div key={layer.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!vis[layer.id]}
                        onChange={(e) =>
                          onVisibilityChange(layer.id, e.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-cyan-400"
                      />
                      {layer.label}
                    </label>

                    <span className="text-[9px] tabular-nums text-slate-500">
                      {Math.round((op[layer.id] ?? 0) * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={op[layer.id] ?? 0}
                    onChange={(e) =>
                      onOpacityChange(layer.id, Number(e.target.value))
                    }
                    className="h-1 w-full cursor-pointer accent-cyan-400"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RISK LEGEND */}
        <section className="border-b border-white/[0.07] pb-4">
          <SectionTitle title="Terrain risk index" icon={Mountain} id="risk" />

          {!collapsed.risk && (
            <div className="grid grid-cols-2 gap-2">
              {risk.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-md bg-white/[0.025] px-2 py-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[9px] text-slate-400">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CURSOR TELEMETRY */}
        <section className="border-b border-white/[0.07] pb-4">
          <SectionTitle title="Cursor telemetry" icon={Gauge} id="telemetry" />

          {!collapsed.telemetry && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="text-[9px] text-slate-500">ELEVATION</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-white">
                  {hover && !Number.isNaN(hover.elev)
                    ? hover.elev.toFixed(1)
                    : "—"}
                  <span className="ml-1 text-[9px] text-slate-500">m</span>
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="text-[9px] text-slate-500">SLOPE</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-white">
                  {hover && !Number.isNaN(hover.slope)
                    ? hover.slope.toFixed(1)
                    : "—"}
                  <span className="ml-1 text-[9px] text-slate-500">°</span>
                </p>
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2">
                <span className="text-[9px] text-slate-500">
                  TERRAIN CLASSIFICATION
                </span>
                <span className="text-[10px] font-bold text-cyan-300">
                  {hover && !Number.isNaN(hover.slope)
                    ? riskOf(hover.slope).name
                    : "NO DATA"}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ROUTE */}
        <section className="border-b border-white/[0.07] pb-4">
          <SectionTitle title="EVA route planning" icon={Route} id="route" />

          {!collapsed.route && (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg bg-white/[0.025] p-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-200">
                    Route waypoints
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    Selected coordinates
                  </p>
                </div>

                <span className="text-lg font-bold tabular-nums text-cyan-400">
                  {pointCount}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onUndo}
                  disabled={pointCount === 0}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] py-2.5 text-[10px] font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 size={13} />
                  Undo
                </button>

                <button
                  onClick={onClear}
                  disabled={pointCount === 0}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-400/15 bg-red-400/[0.06] py-2.5 text-[10px] font-semibold text-red-400 transition hover:bg-red-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Clear route
                </button>
              </div>
            </>
          )}
        </section>

        {/* RESULTS */}
        <section className="pb-4">
          <SectionTitle title="Mission assessment" icon={Activity} id="results" />

          {!collapsed.results && (
            result ? (
              <div className="space-y-3">

                {/* Verdict */}
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-cyan-400" />
                    <span className="text-[9px] font-bold tracking-wider text-cyan-300">
                      ROUTE VERDICT
                    </span>
                  </div>

                  <p className="text-xs font-semibold leading-relaxed text-white">
                    {result.verdict}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "DISTANCE",
                      value: (result.distance / 1000).toFixed(2),
                      unit: "km",
                      icon: Route,
                    },
                    {
                      label: "MAX SLOPE",
                      value: result.maxSlope.toFixed(1),
                      unit: "°",
                      icon: Mountain,
                    },
                    {
                      label: "ELEVATION GAIN",
                      value: `+${result.gain.toFixed(0)}`,
                      unit: "m",
                      icon: ChevronUp,
                    },
                    {
                      label: "ELEVATION LOSS",
                      value: `-${result.loss.toFixed(0)}`,
                      unit: "m",
                      icon: ChevronDown,
                    },
                    {
                      label: "ROUND TRIP TIME",
                      value: ((result.hoursOut + result.hoursBack) * 60).toFixed(0),
                      unit: "min",
                      icon: Clock3,
                    },
                    {
                      label: "OXYGEN CAPACITY",
                      value: result.o2Pct.toFixed(0),
                      unit: "%",
                      icon: Droplets,
                    },
                  ].map((metric) => {
                    const Icon = metric.icon;

                    return (
                      <div
                        key={metric.label}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={12} className="text-slate-500" />
                          <span className="text-[8px] font-semibold tracking-wider text-slate-500">
                            {metric.label}
                          </span>
                        </div>

                        <p className="mt-2 text-base font-bold tabular-nums text-white">
                          {metric.value}
                          <span className="ml-1 text-[9px] font-medium text-slate-500">
                            {metric.unit}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Risk distribution */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="mb-3 text-[9px] font-bold tracking-wider text-slate-400">
                    TERRAIN RISK DISTRIBUTION
                  </p>

                  <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                    {risk.map((item, index) => (
                      <div
                        key={item.name}
                        style={{
                          width: `${(result.fractions[index] ?? 0) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 space-y-2">
                    {risk.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-[9px]"
                      >
                        <span className="flex items-center gap-2 text-slate-400">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>

                        <span className="font-semibold tabular-nums text-slate-200">
                          {((result.fractions[index] ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile */}
                {profile && (
                  <div>
                    <p className="mb-2 text-[9px] font-bold tracking-wider text-slate-400">
                      ELEVATION PROFILE
                    </p>
                    {profile}
                  </div>
                )}

                {/* AI BRIEFING */}
                <div className="rounded-lg border border-violet-400/20 bg-violet-400/[0.04] p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Bot size={16} className="text-violet-400" />
                    <span className="text-[10px] font-bold text-slate-200">
                      AI Mission Briefing
                    </span>
                    <Sparkles size={12} className="ml-auto text-violet-400" />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={onExplain}
                      disabled={brief.status === "loading"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-400/15 px-3 py-2.5 text-[10px] font-bold text-violet-300 transition hover:bg-violet-400/25 disabled:opacity-50"
                    >
                      {brief.status === "loading" ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}

                      {brief.status === "loading"
                        ? "Analyzing..."
                        : "Generate briefing"}
                    </button>

                    <label className="flex cursor-pointer items-center gap-1.5 text-[9px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={auto}
                        onChange={(e) => onAutoChange(e.target.checked)}
                        className="accent-violet-400"
                      />
                      Auto
                    </label>
                  </div>

                  {brief.status === "error" && (
                    <p className="mt-3 rounded-md bg-red-400/[0.08] p-2 text-[10px] text-red-400">
                      {brief.text}
                    </p>
                  )}

                  {brief.status === "done" && (
                    <div className="mt-3 whitespace-pre-wrap rounded-md border border-white/[0.06] bg-black/20 p-3 text-[10px] leading-relaxed text-slate-300">
                      {brief.text}
                    </div>
                  )}

                  <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
                    AI provides mission interpretation. Route metrics are
                    calculated by the terrain analysis engine.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/[0.10] px-4 py-8 text-center">
                <MapPin size={23} className="mx-auto text-slate-600" />

                <p className="mt-3 text-[11px] font-semibold text-slate-300">
                  No route calculated
                </p>

                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Select at least two points on the map to generate a mission assessment.
                </p>
              </div>
            )
          )}
        </section>
      </div>

      {/* FOOTER */}
      <div className="border-t border-white/[0.08] bg-[#0e151e] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] tracking-wider text-slate-500">
            ARES TERRAIN ENGINE
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            OPERATIONAL
          </span>
        </div>
      </div>
    </aside>
  );
}

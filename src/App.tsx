import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import "./styles.css"

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LoadTerrain, sampleAt, analyzeRoute, riskOf, RISK } from './components/terrain.js';
import { summarizeRoute } from "./components/briefing.js"
import Navbar from './components/layout/navbar.js'; 
import SidebarComponent from './components/layout/sidebar.js';
import { Activity, Bot, Crosshair, Layers3, Radio, Route, Sparkles, Trash2, Undo2 } from 'lucide-react';
function App() {
  const LAYERS = [
    { id :"orto", label : "Foto Orbital (HIRISE)", url: '/layers/v2/global/ortho.png', op:1},
    { id: 'hillshade', label: 'Relieve (hillshade)', url: '/layers/v2/global/hillshade.png', op: 0.4 },
    { id: 'elev', label: 'Elevacion', url: '/layers/v2/global/elev.png', op: 0.5 },
    { id: 'slope', label: 'Pendiente / riesgo', url: '/layers/v2/global/slope.png', op: 0.6},
  ];
  const mapEl = useRef(null), mapRef = useRef(null), overlays = useRef({}), routeGrp = useRef(null);
  const [terrain, setTerrain] = useState(null);
  const [vis, setVis] = useState(Object.fromEntries(LAYERS.map((l) => [l.id,!l.off])));
  const [rover, setRover] = useState(null);
  const [showRover, setShowRover] = useState(true);
  const [op, setOp] = useState(Object.fromEntries(LAYERS.map((l) => [l.id, l.op])));
  const [points, setPoints] = useState([]);
  const [hover, setHover] = useState(null);

  const [brief, setBrief] = useState({ status: 'idle', text: '' });
  const [auto, setAuto] = useState(false);
  const reqId = useRef(0);
  const result = useMemo(() => (terrain ? analyzeRoute(terrain, points) : null), [terrain, points]);

  async function explain() {
    if (!result) return;
    const id = ++reqId.current;
    setBrief({ status: 'loading', text: '' });
    try {
      const r = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summarizeRoute(result, points) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      if (id === reqId.current) setBrief({ status: 'done', text: data.text });
    } catch (e) {
      if (id === reqId.current) setBrief({ status: 'error', text: e.message });
    }
  }

  useEffect(() => {
    reqId.current++;
    setBrief({ status: 'idle', text: '' });
    if (!auto || !result) return;
    const t = setTimeout(explain, 900);
    return () => clearTimeout(t);
  }, [result, auto]);

  useEffect(()=>{
    fetch('/layers/v2/global/rover_px.json').then((r) => r.json()).then(setRover).catch(() => {});
  },[])

  useEffect(() => {
  const map = mapRef.current;
  if (!map || !terrain || !rover) return;
  const { width: w, height: h } = terrain;
  const runs = rover.paths.flatMap(({ pts }) => {
    const out = []; let cur = [];
    for (const [c, r] of pts) {
      if (c >= 0 && c < w && r >= 0 && r < h) cur.push([h - r, c]);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  });
  const grp = L.layerGroup();
  L.polyline(runs, { color: '#ffd400', weight: 2, opacity: 0.9, interactive: false }).addTo(grp);
  rover.waypoints.forEach((p) => {
    L.circleMarker([h - (p.row + 0.5), p.col + 0.5], { radius: 3, color: '#000', weight: 1, fillColor: '#ffd400', fillOpacity: 1 })
      .bindTooltip(`Sol ${p.sol} · inclinación real ${p.tilt.toFixed(1)}° · tu DTM ${p.slope_dtm.toFixed(1)}°`)
      .addTo(grp);
  });
  if (showRover) grp.addTo(map);
  return () => grp.remove();
}, [terrain, rover, showRover]);

  useEffect(() => { 
    LoadTerrain().then(setTerrain); }, []);

  useEffect(() => {
    if (!terrain) return;
    const { width: w, height: h } = terrain;
    const map = L.map(mapEl.current, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 4, zoomSnap: 0.25, attributionControl: false });
    const bounds = [[0, 0], [h, w]];
    LAYERS.forEach((l) => { overlays.current[l.id] = L.imageOverlay(l.url, bounds).addTo(map); });

    // Centro del terreno
    const center: L.LatLngExpression = [h / 2, w / 2];

    // Zoom automático para mostrar todo el terreno
    const initialZoom = map.getBoundsZoom(bounds);

    // Iniciar centrado y acercar 0.75 niveles de zoom
    map.setView(center, initialZoom + 2.0);
    routeGrp.current = L.layerGroup().addTo(map);
    map.on('click', (e) => setPoints((p) => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]));
    map.on('mousemove', (e) => setHover(sampleAt(terrain, e.latlng.lat, e.latlng.lng)));
    mapRef.current = map;
    return () => map.remove(); mapRef.current=null
  }, [terrain]);

  useEffect(() => {
    LAYERS.forEach((l) => overlays.current[l.id]?.setOpacity(vis[l.id] ? op[l.id] : 0));
  }, [vis, op, terrain]);

  

  useEffect(() => {
    const g = routeGrp.current; if (!g) return;
    g.clearLayers();
    if (result) {
      for (let i = 1; i < result.samples.length; i++) {
        const a = result.samples[i - 1], b = result.samples[i];
        L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: riskOf(b.slope).color, weight: 4 }).addTo(g);
      }
    }
    points.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 5, color: '#fff', fillColor: '#0af', fillOpacity: 1 }).addTo(g));
  }, [result, points]);

  if (!terrain) return <p style={{ padding: 20 }}>Cargando terreno…</p>;

  return (
  <>
  <div className="">
    <Navbar></Navbar>
  </div>
  <div className="flex h-full min-h-0 w-full overflow-hidden">
   

  {/* 2. PANEL DE CONTROL N.I.N.O */}
  <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-white/[0.08] bg-[#181b24] xl:w-[370px]">

    {/* Panel header */}
    <div className="border-b border-white/[0.08] px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            <span className="text-[9px] font-bold tracking-[0.18em] text-cyan-500">
              (Nave Interplanetaria de Nueva Orbita)
            </span>
          </div>

          <h2 className="mt-2 text-lg font-bold tracking-tight text-white">
            N.I.N.O
          </h2>

          <p className="mt-1 text-[10px] text-slate-500">
            Crater Jezero · HiRISE 3 m/px
          </p>
        </div>

        <div className="rounded-lg border border-cyan-400/20  p-2">
          <Activity className="text-cyan-400" size={20} />
        </div>
      </div>
    </div>

    {/* Panel scrollable */}
    <div className="flex-1 space-y-5 overflow-y-auto p-4">

      {/* Rover */}
      <section>
        <h3 className="mb-3 text-[10px] font-bold tracking-widest text-slate-500">
          MODALIDAD DE DESPLAZAMIENTO
        </h3>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 transition hover:bg-white/[0.05]">
          <input
            type="checkbox"
            checked={showRover}
            onChange={(e) => setShowRover(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />

          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200">
              Ruta Perseverance
            </p>
            <p className="mt-1 text-[9px] text-slate-500">
              Real rover trajectory
            </p>
          </div>

          <Radio className="text-[#81b4c9]" size={16} />
        </label>
      </section>

      {/* Layers */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-500">
            CAPAS GEOSPACIALES
          </h3>
          <Layers3 size={14} className="text-[#81b4c9]" />
        </div>

        <div className="space-y-3">
          {LAYERS.map((l) => (
            <div
              key={l.id}
              className="rounded-lg border border-white/[0.05] bg-white/[0.025] p-3"
            >
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={vis[l.id]}
                    onChange={(e) =>
                      setVis({ ...vis, [l.id]: e.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
                  {l.label}
                </label>

                <span className="text-[9px] font-bold tabular-nums text-[#81b4c9]">
                  {Math.round(op[l.id] * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={op[l.id]}
                onChange={(e) =>
                  setOp({ ...op, [l.id]: +e.target.value })
                }
                className="h-1 w-full cursor-pointer accent-cyan-400"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Risk */}
      <section>
        <h3 className="mb-3 text-[10px] font-bold tracking-widest text-slate-500">
          INDICE DE RIESGO DE TERRENO
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {RISK.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-2 rounded-md bg-white/[0.025] p-2"
            >
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: r.color }}
              />
              <span className="text-[9px] text-slate-400">
                {r.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Cursor */}
      <section className="rounded-lg border border-white/[0.07] bg-[#151923] p-3">
        <div className="mb-3 flex items-center gap-2">
          <Crosshair size={14} className="text-[#81b4c9]" />
          <h3 className="text-[10px] font-bold tracking-widest text-slate-400">
            CURSOR TELEMETRY
          </h3>
        </div>

        <p className="text-xs font-semibold text-white">
          {hover && !Number.isNaN(hover.elev)
            ? `${hover.elev.toFixed(1)} m · ${hover.slope.toFixed(1)}°`
            : "Sin datos de terreno"}
        </p>

        <p className="mt-2 text-[10px] text-slate-500">
          Clasificación:{" "}
          <span className="text-[#81b4c9]">
            {hover && !Number.isNaN(hover.slope)
              ? riskOf(hover.slope).name
              : "—"}
          </span>
        </p>
      </section>

      {/* Route */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-500">
            PLANIFICACION EVA
          </h3>
          <Route size={14} className="text-[#81b4c9]" />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setPoints((p) => p.slice(0, -1))}
            disabled={!points.length}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] py-2.5 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-40"
          >
            <Undo2 size={13} />
            Deshacer
          </button>

          <button
            onClick={() => setPoints([])}
            disabled={!points.length}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-400/15 bg-red-400/[0.06] py-2.5 text-[10px] font-semibold text-red-400 hover:bg-red-400/[0.12] disabled:opacity-40"
          >
            <Trash2 size={13} />
            Limpiar
          </button>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
          <p className="text-[9px] text-slate-500">
            PUNTOS SELECCIONADOS
          </p>
          <p className="mt-1 text-xl font-bold text-cyan-400">
            {points.length}
          </p>
        </div>
      </section>

      {/* Results */}
      {result ? (
        <section>
          <h3 className="mb-3 text-[10px] font-bold tracking-widest text-slate-500">
            RESULTADOS DE SIMULACIÓN
          </h3>

          <div className="rounded-lg border border-white-400/15 bg-[#0a0e17]/[0.05] p-3">
            <p className="text-[9px] font-bold text-white">
              ROUTE VERDICT
            </p>
            <p className="mt-2 text-xs font-semibold text-white">
              {result.verdict}
            </p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["DISTANCIA", `${(result.distance / 1000).toFixed(2)} km`],
              ["PENDIENTE MÁX.", `${result.maxSlope.toFixed(1)}°`],
              ["DESNIVEL +", `+${result.gain.toFixed(0)} m`],
              ["DESNIVEL -", `-${result.loss.toFixed(0)} m`],
              ["TIEMPO IDA", `${(result.hoursOut * 60).toFixed(0)} min`],
              ["OXÍGENO", `${result.o2Pct.toFixed(0)} %`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-white/[0.035] p-3"
              >
                <p className="text-[8px] font-semibold text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-white/[0.10] p-4 text-center">
          <p className="text-[10px] text-slate-500">
            Selecciona al menos dos puntos para analizar una ruta.
          </p>
        </div>
      )}
    </div>

    {/* Footer */}
    <div className="border-t border-white/[0.08] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-slate-500">
          N.I.N.O 
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          ONLINE
        </span>
      </div>
    </div>
  </aside>

  {/* 3. AREA GEOESPACIAL */}
  <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-[#0B1119] p-3">

    {/* MAPA */}
    <section className="relative min-h-[250px] flex-[1.25] overflow-hidden rounded-xl border border-white/[0.08] bg-[#111923]">

      <div
        ref={mapEl}
        className="absolute inset-0"
      />

      {/* Map information overlay */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/10 bg-[#0a0e17]/90 px-3 py-2 backdrop-blur-md">
        <p className="text-[9px] font-bold tracking-widest text-white">
          JEZERO CRATER
        </p>
        <p className="mt-1 text-[9px] text-slate-400">
          HiRISE · Digital Terrain Model
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border border-emerald-400/20 bg-[#0a0e17]/90 px-3 py-2">
        <p className="text-[10px] font-bold text-emerald-400">
          ● ROUTE NOMINAL
        </p>
      </div>
      
    </section>

    {/* ANALYSIS */}
    <section className="flex min-h-[230px] flex-[0.75] flex-col gap-3 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#181b24] p-4">

      {result ? (
        <>
          {/* Profile */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-[#81b4c9]" />
                <h3 className="text-[11px] font-bold tracking-wider text-slate-200">
                  PERFIL ALTIMÉTRICO LONGITUDINAL
                </h3>
              </div>

              <span className="text-[9px] text-slate-500">
                {(result.distance / 1000).toFixed(2)} KM
              </span>
            </div>

            <div className="bg-white/[0.035] rounded-2xl p-2">
              <Profile samples={result.samples} />
            </div>
          </div>

          {/* Briefing */}
          <div className="border-t border-white/[0.07] pt-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={15} className="text-violet-400" />
                <h3 className="text-[11px] font-bold text-slate-200">
                  AI MISSION BRIEFING
                </h3>
              </div>

              <label className="flex items-center gap-2 text-[10px] text-slate-400">
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                  className="accent-violet-400"
                />
                Auto
              </label>
            </div>

            <button
              onClick={explain}
              disabled={brief.status === "loading"}
              className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-4 py-2 text-[10px] font-bold text-violet-300 hover:bg-violet-400/[0.15] disabled:opacity-50"
            >
              <Sparkles size={13} />
              {brief.status === "loading"
                ? "Analizando..."
                : "Explicar ruta con IA"}
            </button>

            {brief.status === "loading" && (
              <p className="mt-3 text-[10px] text-slate-400">
                Analizando datos topográficos...
              </p>
            )}

            {brief.status === "error" && (
              <p className="mt-3 text-[10px] text-red-400">
                No se pudo generar: {brief.text}
              </p>
            )}

            {brief.status === "done" && (
              <div className="mt-3 whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-relaxed text-slate-300">
                {brief.text}
              </div>
            )}

            <p className="mt-2 text-[9px] text-slate-500">
              Las métricas son calculadas por el motor topográfico.
              La IA proporciona interpretación.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Activity size={25} className="text-slate-600" />
          <p className="mt-3 text-xs font-semibold text-slate-300">
            Análisis topográfico
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            El perfil y el briefing aparecerán al calcular una ruta.
          </p>
        </div>
      )}
    </section>
  </main>
  </div>
  </>

  );
}

function Profile({ samples }) {
  const vals = samples.map((s) => s.elev).filter((v) => !Number.isNaN(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals), D = samples.at(-1).d || 1;
  const W = 300, H = 80;
  const d = samples.map((s, i) => `${i ? 'L' : 'M'}${(s.d / D) * W},${H - ((s.elev - min) / (max - min || 1)) * H}`).join(' ');
  return (
    <svg width={W} height={H + 4} className="profile">
      <path d={d} fill="none" stroke="#7cf" strokeWidth="2" />
      <text x="2" y="12" fontSize="10" fill="#aaa">{max.toFixed(0)} m</text>
      <text x="2" y={H} fontSize="10" fill="#aaa">{min.toFixed(0)} m</text>
    </svg>
  );
}

export default App

import { riskOf, RISK } from './terrain.js';

const ok = (v) => typeof v === 'number' && !Number.isNaN(v);
const r1 = (v) => (ok(v) ? Math.round(v * 10) / 10 : null);
const pct = (n, total) => (total ? Math.round((100 * n) / total) : 0);

// Convierte el resultado de analyzeRoute en un resumen corto (por tramo) para la IA.
export function summarizeRoute(result, points) {
  const { samples } = result;
  const D = samples.at(-1)?.d || 1;
  const k = result.distance / D; // pasa la distancia de las muestras a metros reales

  // Largo de cada tramo (entre clics) en unidades del mapa, para repartir la distancia total.
  const seg = [];
  for (let i = 1; i < points.length; i++) {
    seg.push(Math.hypot(points[i].lat - points[i - 1].lat, points[i].lng - points[i - 1].lng));
  }
  const total = seg.reduce((a, b) => a + b, 0) || 1;

  let acc = 0;
  const tramos = seg.map((len, i) => {
    const d0 = (acc / total) * D;
    acc += len;
    const d1 = (acc / total) * D;
    const last = i === seg.length - 1;
    const inLeg = samples.filter((s) => s.d >= d0 && (last ? s.d <= d1 : s.d < d1));
    const valid = inLeg.filter((s) => ok(s.slope) && ok(s.elev));

    const counts = Object.fromEntries(RISK.map((r) => [r.name, 0]));
    valid.forEach((s) => { counts[riskOf(s.slope).name] += 1; });

    let sube = 0, baja = 0;
    for (let j = 1; j < valid.length; j++) {
      const dz = valid[j].elev - valid[j - 1].elev;
      if (dz > 0) sube += dz; else baja -= dz;
    }
    const worst = valid.reduce((a, s) => (!a || s.slope > a.slope ? s : a), null);

    return {
      tramo: i + 1,
      largo_m: Math.round((d1 - d0) * k),
      pendiente_media_deg: valid.length ? r1(valid.reduce((a, s) => a + s.slope, 0) / valid.length) : null,
      pendiente_max_deg: worst ? r1(worst.slope) : null,
      punto_mas_empinado: worst
        ? { a_los_m_del_inicio_del_tramo: Math.round((worst.d - d0) * k), elevacion_m: Math.round(worst.elev) }
        : null,
      subida_m: Math.round(sube),
      bajada_m: Math.round(baja),
      riesgo_pct: Object.fromEntries(RISK.map((r) => [r.name, pct(counts[r.name], valid.length)])),
      sin_datos_pct: pct(inLeg.length - valid.length, inLeg.length),
    };
  });

  return {
    veredicto_algoritmo: result.verdict,
    distancia_km: Math.round((result.distance / 1000) * 100) / 100,
    desnivel_m: { sube: Math.round(result.gain), baja: Math.round(result.loss) },
    pendiente_max_deg: r1(result.maxSlope),
    tiempo_min: { ida: Math.round(result.hoursOut * 60), vuelta: Math.round(result.hoursBack * 60) },
    oxigeno_ida_y_vuelta_pct_de_capacidad: Math.round(result.o2Pct),
    riesgo_pct_ruta: Object.fromEntries(RISK.map((r, i) => [r.name, Math.round(result.fractions[i] * 100)])),
    tramos,
  };
}
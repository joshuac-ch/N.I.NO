
export async function LoadTerrain(base = '/layers'){
    const meta = await (await fetch(`${base}/v2/global/meta.json`)).json();
    const get = async (f) => (await fetch(`${base}/v2/global/${f}`)).arrayBuffer();
    const e16 = new Int16Array(await get('elev.i16'));
    const s8 = new Uint8Array(await get('slope.u8'));
    const n = meta.width * meta.height;
    console.log('terreno', meta, 'esperado', n, 'elev', e16.length, 'slope', s8.length);
    if (e16.length !== n || s8.length !== n) throw new Error('El tamaño de los datos no coincide con meta.json');
    const elev = new Float32Array(n), slope = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        elev[i] = e16[i] === -32768 ? NaN : e16[i] / meta.elev_scale;
        slope[i] = s8[i] === 255 ? NaN : s8[i] / meta.slope_scale;
    }
    return { ...meta, elev, slope };
    
}

//mapa
// En el mapa (CRS.Simple): lat = alto - fila, lng = columna
const at = (t, arr, col, row) => {
  const c = Math.round(col), r = Math.round(row);
  if (!(c >= 0 && r >= 0 && c < t.width && r < t.height)) return NaN;
  const v = arr[r * t.width + c];
  return v === undefined ? NaN : v;
};
export const sampleAt = (t, lat, lng) => ({
  elev: at(t, t.elev, lng, t.height - lat),
  slope: at(t, t.slope, lng, t.height - lat),
});

export const RISK = [
  { max: 10, name: 'Seguro', color: '#2ea043' },
  { max: 20, name: 'Precaución', color: '#f0c828' },
  { max: 30, name: 'Difícil', color: '#eb781e' },
  { max: Infinity, name: 'No transitable', color: '#d22828' },
];
export const riskOf = (s) =>
 !Number.isFinite(s) ? { name: 'Sin datos', color: '#888' }
  : RISK.find((r) => s < r.max) ?? RISK[RISK.length - 1];

// SUPUESTOS DEL MODELO: valores provisionales, hay que afinarlos
const EVA = { baseKmh: 2.0, o2Hours: 8, reserve: 0.3, uphillO2: 4 };

function legCost(samples) {
  let hours = 0, o2 = 0;
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i - 1], s = samples[i];
    const dx = s.d - p.d, dh = s.elev - p.elev;
    if (!dx || Number.isNaN(dh)) continue;
    const S = dh / dx;
    // Función de Tobler normalizada: en plano = baseKmh
    const v = EVA.baseKmh * Math.exp(-3.5 * (Math.abs(S + 0.05) - 0.05));
    const h = dx / 1000 / v;
    hours += h;
    o2 += h * (1 + EVA.uphillO2 * Math.max(0, S));
  }
  return { hours, o2 };
}

export function analyzeRoute(t, pts) {
  if (pts.length < 2) return null;
  const step = 2; // píxeles entre muestras (6 m)
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.lat - a.lat, b.lng - a.lng) / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const f = k / n;
      const lat = a.lat + (b.lat - a.lat) * f, lng = a.lng + (b.lng - a.lng) * f;
      samples.push({ lat, lng, ...sampleAt(t, lat, lng) });
    }
  }
  samples.forEach((s, i) => {
    const p = samples[i - 1];
    s.d = i === 0 ? 0 : p.d + Math.hypot(s.lat - p.lat, s.lng - p.lng) * t.pixel_m;
  });
  let gain = 0, loss = 0, maxSlope = 0;
  const bins = [0, 0, 0, 0];
  samples.forEach((s, i) => {
    if (!Number.isNaN(s.slope)) {
      maxSlope = Math.max(maxSlope, s.slope);
      bins[RISK.findIndex((r) => s.slope < r.max)]++;
    }
    if (i && !Number.isNaN(s.elev) && !Number.isNaN(samples[i - 1].elev)) {
      const dh = s.elev - samples[i - 1].elev;
      dh > 0 ? (gain += dh) : (loss -= dh);
    }
  });
  const total = bins.reduce((a, b) => a + b, 0) || 1;
  const out = legCost(samples), back = legCost([...samples].reverse().map((s, i, arr) => ({
    ...s, d: i === 0 ? 0 : arr[0].d - s.d,
  })));
  const o2Pct = ((out.o2 + back.o2) / EVA.o2Hours) * 100;
  const gapFrac = samples.filter((s) => Number.isNaN(s.slope)).length / samples.length;
  const verdict = gapFrac > 0 ? 'NO-GO: la ruta cruza zona sin datos'
  : bins[3] > 0 ? 'NO-GO: tramo no transitable'
  : o2Pct > (1 - EVA.reserve) * 100 ? 'NO-GO: oxígeno insuficiente con reserva'
  : bins[2] > 0 ? 'GO con precaución' : 'GO';
  return {
    samples, distance: samples.at(-1).d, gain, loss, maxSlope,
    fractions: bins.map((b) => b / total),
    hoursOut: out.hours, hoursBack: back.hours, o2Pct, verdict,
  };
}
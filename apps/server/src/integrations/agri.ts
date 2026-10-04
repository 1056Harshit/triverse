/**
 * Agronomy helpers for the farm agent.
 *
 * BANNED_PESTICIDES is a seed list of active ingredients banned in India.
 * Sync it with the official CIB&RC list (ppqs.gov.in) before launch and on
 * every new gazette notification; the agent also re-checks with web search.
 */
export const BANNED_PESTICIDES = [
  "aldrin", "benzene hexachloride", "bhc", "calcium cyanide", "chlordane", "copper acetoarsenite", "dibromochloropropane",
  "endrin", "ethyl mercury chloride", "ethyl parathion", "heptachlor", "menazone", "nitrofen", "paraquat dimethyl sulphate",
  "pentachloro nitrobenzene", "pentachlorophenol", "phenyl mercury acetate", "sodium methane arsonate", "tetradifon", "toxaphene",
  "aldicarb", "chlorobenzilate", "dieldrin", "maleic hydrazide", "ethylene dibromide", "trichloro acetic acid", "metoxuron",
  "chlorfenvinphos", "lindane", "endosulfan", "methyl parathion", "phosphamidon",
  // 2018 order
  "benomyl", "carbaryl", "diazinon", "fenarimol", "fenthion", "linuron", "methoxy ethyl mercury chloride", "sodium cyanide",
  "thiometon", "tridemorph", "trifluralin",
];

export function checkBanned(activeIngredient: string): { banned: boolean; match?: string } {
  const q = activeIngredient.toLowerCase().trim();
  const match = BANNED_PESTICIDES.find((b) => q.includes(b) || b.includes(q));
  return match ? { banned: true, match } : { banned: false };
}

export interface SprayWindow { start: string; end: string; reason: string }
export interface FarmWeather { summary: string; next24h: { maxTempC: number; minTempC: number; rainMm: number; maxWindKmh: number }; sprayWindows: SprayWindow[] }

/** Open-Meteo (free, no key). Spray when wind < 12 km/h, rain chance < 20% for 6h, 10–32 °C. */
export async function farmWeather(lat: number, lng: number): Promise<FarmWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,relative_humidity_2m&forecast_days=2&timezone=Asia%2FKolkata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const h = ((await res.json()) as { hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; precipitation: number[]; wind_speed_10m: number[]; relative_humidity_2m: number[] } }).hourly;
  const n = Math.min(24, h.time.length);
  const slice = <T>(a: T[]) => a.slice(0, n);
  const temps = slice(h.temperature_2m), rain = slice(h.precipitation), wind = slice(h.wind_speed_10m);
  const good = h.time.map((_, i) => {
    const ahead = h.precipitation_probability.slice(i, i + 6);
    return wind[i] !== undefined && h.wind_speed_10m[i] < 12 && Math.max(...ahead) < 20 && h.temperature_2m[i] >= 10 && h.temperature_2m[i] <= 32 && /T0[6-9]|T1[0-7]/.test(h.time[i]);
  });
  const windows: SprayWindow[] = [];
  for (let i = 0; i < good.length; i++) {
    if (!good[i]) continue;
    let j = i;
    while (j + 1 < good.length && good[j + 1]) j++;
    if (j - i >= 1) windows.push({ start: h.time[i], end: h.time[j + 1] ?? h.time[j], reason: "Low wind, no rain expected, mild temperature" });
    i = j;
  }
  const next24h = { maxTempC: Math.max(...temps), minTempC: Math.min(...temps), rainMm: Math.round(rain.reduce((a, b) => a + b, 0) * 10) / 10, maxWindKmh: Math.max(...wind) };
  const summary = next24h.rainMm > 5 ? "Rain expected: postpone spraying and fertiliser top-dressing." : windows.length ? "Dry spell ahead with good spray windows." : "Windy or hot: spray only early morning if needed.";
  return { summary, next24h, sprayWindows: windows.slice(0, 3) };
}

export interface TripDay { date: string; maxC: number; minC: number; rainMm: number; snowCm: number; summary: string }

/** Daily forecast for a destination (up to 10 days), with plain-language travel cautions. */
export async function tripWeather(lat: number, lng: number, days = 5): Promise<TripDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&forecast_days=${Math.min(10, days)}&timezone=Asia%2FKolkata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const d = ((await res.json()) as { daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; snowfall_sum: number[] } }).daily;
  return d.time.map((date, i) => {
    const rain = d.precipitation_sum[i], snow = d.snowfall_sum[i];
    const summary = snow > 2 ? "Snow likely: check road status, carry chains, avoid high passes" : rain > 15 ? "Heavy rain: landslide risk on hill roads, travel in daylight" : rain > 3 ? "Some rain: carry a jacket" : d.temperature_2m_min[i] < 2 ? "Freezing nights: pack warm layers" : "Good travel weather";
    return { date, maxC: d.temperature_2m_max[i], minC: d.temperature_2m_min[i], rainMm: rain, snowCm: snow, summary };
  });
}

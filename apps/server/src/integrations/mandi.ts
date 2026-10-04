import { env } from "../env.ts";

/**
 * Live mandi (wholesale market) prices from the Government of India's open data platform
 * (Agmarknet "Current daily price of various commodities from various markets").
 * Get a free key at data.gov.in; the shared sample key works but returns only a few rows.
 */
const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
const SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

export interface MandiPrice { market: string; district: string; state: string; commodity: string; variety: string; date: string; min: number; max: number; modal: number }

export async function mandiPrices(commodity: string, state?: string, limit = 15): Promise<MandiPrice[]> {
  const q = new URLSearchParams({ "api-key": env.DATA_GOV_API_KEY ?? SAMPLE_KEY, format: "json", limit: String(limit) });
  q.set("filters[commodity]", titleCase(commodity));
  if (state) q.set("filters[state]", titleCase(state));
  const res = await fetch(`https://api.data.gov.in/resource/${RESOURCE}?${q}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`data.gov.in ${res.status}`);
  const data = (await res.json()) as { records?: Array<Record<string, string>> };
  return (data.records ?? []).map((r) => ({
    market: r.market, district: r.district, state: r.state, commodity: r.commodity, variety: r.variety, date: r.arrival_date,
    // Prices are ₹ per quintal (100 kg).
    min: Number(r.min_price), max: Number(r.max_price), modal: Number(r.modal_price),
  })).sort((a, b) => b.modal - a.modal);
}

const titleCase = (s: string) => s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

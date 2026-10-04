import { env } from "../env.ts";

/**
 * Driver verification. A photo of a DL/RC proves nothing on its own, so every
 * check goes to government sources through a licensed KYC provider:
 *   - Driving licence → Sarathi (Parivahan)
 *   - Vehicle RC + insurance + fitness → Vahan
 *   - Selfie ↔ DL photo face match + liveness
 */
export interface DriverKycInput {
  dlNumber: string;
  dob: string; // YYYY-MM-DD
  rcNumber: string;
  selfieBase64: string;
  fullName: string;
}

export interface KycCheck { label: string; ok: boolean; note?: string }
export interface DriverKycResult {
  status: "verified" | "rejected" | "pending";
  checks: KycCheck[];
  vehicle?: { model: string; color: string; fuel: string; insuranceValidTill: string; seats: number };
  providerRef?: string;
}

interface KycProvider { verifyDriver(i: DriverKycInput): Promise<DriverKycResult> }

const mock: KycProvider = {
  async verifyDriver(i) {
    const dlOk = /^[A-Z]{2}\d{2}\s?\d{11}$/.test(i.dlNumber.replace(/-/g, "").toUpperCase());
    const rcOk = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(i.rcNumber.replace(/[\s-]/g, "").toUpperCase());
    const checks: KycCheck[] = [
      { label: "Driving licence (Sarathi)", ok: dlOk, note: dlOk ? undefined : "Licence number format looks wrong" },
      { label: "Vehicle RC (Vahan)", ok: rcOk, note: rcOk ? undefined : "RC number format looks wrong" },
      { label: "Insurance active", ok: rcOk },
      { label: "Selfie face-match with licence photo", ok: i.selfieBase64.length > 1000 },
    ];
    return {
      status: checks.every((c) => c.ok) ? "verified" : "rejected", checks, providerRef: `mock-${Date.now()}`,
      vehicle: rcOk ? { model: "Maruti Dzire", color: "White", fuel: "Petrol", insuranceValidTill: "2027-03-31", seats: 4 } : undefined,
    };
  },
};

/** Surepass adapter. Confirm endpoint paths and payloads against your contract before going live. */
const surepass: KycProvider = {
  async verifyDriver(i) {
    const base = "https://kyc-api.surepass.io/api/v1";
    const call = async <T>(path: string, body: unknown): Promise<T> => {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.SUREPASS_TOKEN}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`KYC ${path} ${res.status}`);
      return (await res.json()) as T;
    };
    type DL = { data: { name: string; doe: string; profile_image: string; vehicle_classes: string[] } };
    type RC = { data: { maker_model: string; color: string; fuel_type: string; insurance_upto: string; seat_capacity: string; rc_status: string; owner_name: string } };
    type Face = { data: { match_status: boolean; confidence: number } };

    const [dl, rc] = await Promise.all([
      call<DL>("/driving-license/driving-license", { id_number: i.dlNumber, dob: i.dob }),
      call<RC>("/rc/rc-full", { id_number: i.rcNumber }),
    ]);
    const face = await call<Face>("/face/face-match", { selfie: i.selfieBase64, id_card: dl.data.profile_image });

    const now = new Date();
    const dlValid = new Date(dl.data.doe) > now;
    const lmv = dl.data.vehicle_classes.some((c) => /LMV|MCWG|TRANS/i.test(c));
    const insured = new Date(rc.data.insurance_upto) > now;
    const active = /active/i.test(rc.data.rc_status);
    const nameMatch = similar(dl.data.name, i.fullName);
    const checks: KycCheck[] = [
      { label: "Driving licence valid (Sarathi)", ok: dlValid && lmv, note: !dlValid ? "Licence has expired" : !lmv ? "Licence doesn't cover cars (LMV)" : undefined },
      { label: "Name on licence matches profile", ok: nameMatch },
      { label: "Vehicle RC active (Vahan)", ok: active },
      { label: `Insurance valid till ${rc.data.insurance_upto}`, ok: insured, note: insured ? undefined : "Insurance has lapsed" },
      { label: "Selfie face-match with licence photo", ok: face.data.match_status && face.data.confidence >= 80 },
    ];
    return {
      status: checks.every((c) => c.ok) ? "verified" : "rejected", checks,
      vehicle: { model: rc.data.maker_model, color: rc.data.color, fuel: rc.data.fuel_type, insuranceValidTill: rc.data.insurance_upto, seats: Number(rc.data.seat_capacity) - 1 },
    };
  },
};

function similar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean);
  const A = new Set(norm(a)), B = norm(b);
  return B.filter((w) => A.has(w)).length >= Math.min(2, B.length);
}

export const kyc: KycProvider = env.KYC_PROVIDER === "surepass" ? surepass : mock;

export function maskId(id: string): string {
  const s = id.replace(/[\s-]/g, "").toUpperCase();
  return s.slice(0, 4) + "•".repeat(Math.max(0, s.length - 6)) + s.slice(-2);
}

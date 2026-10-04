import { env } from "../env.ts";

/**
 * Sends an SMS OTP. First configured provider wins:
 *   Twilio → 2Factor.in (+91, pre-approved OTP template) → MSG91 (own DLT template) → dev log.
 * In India, MSG91 needs your DLT-registered sender and template; 2Factor works on its own.
 */
export async function sendSmsOtp(phoneE164: string, code: string): Promise<void> {
  if (!env.SMS_ENABLED) {
    console.info(`[sms:dev] to=${phoneE164} (SMS_ENABLED=false: local test mode, code shown in the app)`);
    return;
  }
  const body = `${code} is your TriVerse code. Valid 10 min. Never share it.`;

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { authorization: "Basic " + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phoneE164, From: env.TWILIO_FROM_NUMBER, Body: body }),
    });
    if (!r.ok) throw new Error(`Twilio ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (env.TWOFACTOR_API_KEY && phoneE164.startsWith("+91")) {
    const tpl = env.TWOFACTOR_TEMPLATE ? `/${encodeURIComponent(env.TWOFACTOR_TEMPLATE)}` : "";
    const r = await fetch(`https://2factor.in/API/V1/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/${phoneE164.slice(1)}/${code}${tpl}`);
    const j = (await r.json().catch(() => ({}))) as { Status?: string; Details?: string };
    if (!r.ok || j.Status !== "Success") throw new Error(`2Factor: ${j.Details ?? r.status}`);
    return;
  }
  if (env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", env.MSG91_OTP_TEMPLATE_ID);
    url.searchParams.set("mobile", phoneE164.replace("+", ""));
    url.searchParams.set("otp", code);
    const r = await fetch(url, { method: "POST", headers: { authkey: env.MSG91_AUTH_KEY, "content-type": "application/json" }, body: "{}" });
    if (!r.ok) throw new Error(`MSG91 ${r.status}`);
    return;
  }
  console.info(`[sms:dev] to=${phoneE164} (no SMS provider configured)`);
}

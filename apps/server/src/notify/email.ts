import { Resend } from "resend";
import nodemailer from "nodemailer";
import { renderEmail, type EmailTemplate } from "@triverse/emails";
import { BRAND } from "@triverse/shared";
import { env } from "../env.ts";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const smtp = env.SMTP_URL
  ? nodemailer.createTransport(env.SMTP_URL)
  : env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s/g, "") } })
    : null;

/** "PvtFrnd <hello@pvtfrnd.com>" → { name, email } */
function sender() {
  // The display name is always the brand; EMAIL_FROM only decides the address.
  const m = /^(.*?)\s*<([^>]+)>$/.exec(env.EMAIL_FROM);
  return { name: BRAND.name, email: m ? m[2] : env.EMAIL_FROM };
}
const FROM = () => `${sender().name} <${sender().email}>`;

type Provider = { name: string; send: (m: { to: string; subject: string; html: string; text: string; tag: string; idempotencyKey?: string }) => Promise<void> };

const configured: (Provider | false | null | undefined | "")[] = [
  resend && { name: "Resend", send: async (m) => {
    const { error } = await resend.emails.send(
      { from: FROM(), to: m.to, subject: m.subject, html: m.html, text: m.text, tags: [{ name: "template", value: m.tag }] },
      m.idempotencyKey ? { idempotencyKey: m.idempotencyKey } : undefined,
    );
    if (error) throw new Error(`Resend: ${error.message}`);
  } },
  // HTTPS APIs before SMTP: many hosts (e.g. Render's free plan) block outgoing SMTP ports.
  env.BREVO_API_KEY && { name: "Brevo", send: async (m) => {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: sender(), to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } },
  env.GMAIL_RELAY_URL && env.GMAIL_RELAY_SECRET && { name: "Gmail relay", send: async (m) => {
    const r = await fetch(env.GMAIL_RELAY_URL!, {
      method: "POST", signal: AbortSignal.timeout(15_000), redirect: "follow",
      // Apps Script answers in ~3 s for text/plain but stalls ~30 s and returns an HTML error page for application/json.
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: env.GMAIL_RELAY_SECRET, to: m.to, subject: m.subject, html: m.html, text: m.text, name: sender().name }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!r.ok || !j.ok) throw new Error(`Gmail relay: ${j.error ?? r.status}`);
  } },
  smtp && { name: "SMTP", send: async (m) => { await smtp.sendMail({ from: FROM(), to: m.to, subject: m.subject, html: m.html, text: m.text }); } },
  env.SENDGRID_API_KEY && { name: "SendGrid", send: async (m) => {
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${env.SENDGRID_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: m.to }] }], from: sender(), subject: m.subject,
        content: [{ type: "text/plain", value: m.text }, { type: "text/html", value: m.html }],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(/credits/i.test(body) ? "SendGrid has no sending credits left" : `SendGrid ${r.status}: ${body.slice(0, 200)}`);
    }
  } },
];
const providers = configured.filter((p): p is Provider => !!p);

/** Tries each configured provider in turn (Resend → Brevo → Gmail relay → Gmail/SMTP → SendGrid); dev log when none is set. */
export async function sendEmail(to: string, email: EmailTemplate, opts: { idempotencyKey?: string } = {}) {
  const { subject, html, text } = await renderEmail(email);
  if (!providers.length) { console.info(`[email:dev] to=${to} subject="${subject}"`); return; }
  const errors: string[] = [];
  for (const p of providers) {
    try { await p.send({ to, subject, html, text, tag: email.template, idempotencyKey: opts.idempotencyKey }); return; }
    catch (e) { errors.push(`${p.name}: ${(e as Error).message}`); }
  }
  throw new Error(errors.join("; "));
}

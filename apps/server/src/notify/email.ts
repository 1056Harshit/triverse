import { Resend } from "resend";
import nodemailer from "nodemailer";
import { renderEmail, type EmailTemplate } from "@triverse/emails";
import { env } from "../env.ts";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const smtp = env.SMTP_URL
  ? nodemailer.createTransport(env.SMTP_URL)
  : env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s/g, "") } })
    : null;

/** "TriVerse <hello@pvtfrnd.com>" → { name, email } */
function sender() {
  const m = /^(.*?)\s*<([^>]+)>$/.exec(env.EMAIL_FROM);
  return m ? { name: m[1] || "TriVerse", email: m[2] } : { name: "TriVerse", email: env.EMAIL_FROM };
}

/** First configured provider wins: Resend → Gmail/SMTP → Brevo → SendGrid → dev log. */
export async function sendEmail(to: string, email: EmailTemplate, opts: { idempotencyKey?: string } = {}) {
  const { subject, html, text } = await renderEmail(email);
  const from = sender();

  if (resend) {
    const { error } = await resend.emails.send(
      { from: env.EMAIL_FROM, to, subject, html, text, tags: [{ name: "template", value: email.template }] },
      opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
    );
    if (error) throw new Error(`Resend: ${error.message}`);
    return;
  }
  if (smtp) {
    await smtp.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    return;
  }
  if (env.BREVO_API_KEY) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (env.SENDGRID_API_KEY) {
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { authorization: `Bearer ${env.SENDGRID_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }], from, subject,
        content: [{ type: "text/plain", value: text }, { type: "text/html", value: html }],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(/credits/i.test(body) ? "SendGrid has no sending credits left" : `SendGrid ${r.status}: ${body.slice(0, 200)}`);
    }
    return;
  }
  console.info(`[email:dev] to=${to} subject="${subject}"`);
}

/**
 * TriVerse Gmail relay — sends app emails from your Gmail over HTTPS (for hosts that block SMTP).
 * Setup: script.google.com → New project → paste this → set SECRET → Deploy → New deployment →
 * type "Web app", Execute as "Me", Who has access "Anyone" → copy the /exec URL into GMAIL_RELAY_URL.
 */
const SECRET = "PASTE_GMAIL_RELAY_SECRET_HERE";

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.secret !== SECRET) return out({ ok: false, error: "forbidden" });
    MailApp.sendEmail({ to: b.to, subject: b.subject, body: b.text, htmlBody: b.html, name: b.name || "TriVerse" });
    return out({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

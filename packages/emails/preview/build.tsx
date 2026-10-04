import { writeFileSync } from "node:fs";
import { renderEmail } from "../src/index.ts";
const jobs = [
  { template: "otp", props: { code: "482916" } },
  { template: "welcome", props: { name: "Harshit Gupta", service: "farm", city: "Shimla", spotlight: { title: "Good spray window: 6–9 AM tomorrow", body: "Low wind and no rain for 18 hours. Ideal for your apple orchard's scab protection round." } } },
  { template: "welcome", props: { name: "Harshit Gupta", service: "ride", city: "Shimla", spotlight: { title: "Shimla → Chandigarh: 14 verified rides this weekend", body: "Seats from ₹260. The Volvo is ≈ ₹445." } } },
  { template: "welcome", props: { name: "Harshit Gupta", service: "dine", city: "Shimla" } },
  { template: "ride-booked", props: {} },
  { template: "driver-verified", props: {} },
  { template: "campaign", props: {} },
] as const;
for (const [i, j] of jobs.entries()) {
  const r = await renderEmail(j as any);
  const name = `${i}-${j.template}${"service" in j.props ? "-" + (j.props as any).service : ""}.html`;
  writeFileSync(new URL(name, import.meta.url), r.html.replaceAll("https://pvtfrnd.com/brand", "../../../brand/png"));
  console.log(name, "|", r.subject, "|", r.text.length, "chars text");
}

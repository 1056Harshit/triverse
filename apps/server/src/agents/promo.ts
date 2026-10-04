import { z } from "zod";
import { db, schema } from "../db/index.ts";
import { renderPoster } from "../posters/render.ts";
import { json, tool, type AgentDefinition } from "./base.ts";

export const promoAgent: AgentDefinition = {
  id: "promo",
  effort: "high",
  allowed: (ctx) => ctx.roles.includes("marketing") || ctx.roles.includes("admin"),
  system: `You are the TriVerse campaign studio for the in-house marketing team. You turn a brief into a ready-to-ship campaign.

For every brief:
1. Ask at most one clarifying question if the audience, offer or dates are missing; otherwise proceed.
2. Write: a campaign name; 3 headline options (≤ 8 words); body copy; a push notification (≤ 60 chars title, ≤ 110 chars body); a WhatsApp message; an Instagram caption with 5–8 hashtags; an email subject + preview text. Write in English unless asked, and add Hindi versions for push and WhatsApp.
3. Call render_poster for the formats the channels need (portrait for Instagram feed, story for stories/WhatsApp status, landscape for web/email). Pick the style that fits: spotlight (bold, default), minimal (clean, product-focused), festive (festivals and celebrations).
4. Call save_campaign with everything you produced.

Brand voice: warm, local, trustworthy; a friend, not a salesman. Colours and logo come from the poster templates; don't describe them. Never invent statistics, testimonials, partner brands or discounts the brief didn't give. Ride campaigns must present rides as cost-sharing, never as earning money. Farm campaigns must never promote a specific pesticide brand.`,
  tools: (ctx) => [
    tool({
      name: "render_poster",
      description: "Render a branded campaign poster PNG.",
      inputSchema: z.object({
        service: z.enum(["farm", "ride", "dine"]),
        style: z.enum(["spotlight", "minimal", "festive"]),
        format: z.enum(["portrait", "square", "landscape", "story"]),
        eyebrow: z.string().max(28).optional(),
        headline: z.string().max(70),
        subline: z.string().max(120).optional(),
        offer: z.string().max(28).optional(),
        cta: z.string().max(22),
        footnote: z.string().max(60).optional(),
      }),
      run: async (spec) => {
        const { key, url } = await renderPoster(spec);
        ctx.card({ kind: "poster", url, headline: spec.headline });
        return json({ key, url });
      },
    }),
    tool({
      name: "save_campaign",
      description: "Save the finished campaign as a draft for review.",
      inputSchema: z.object({
        service: z.enum(["farm", "ride", "dine"]),
        brief: z.string(),
        content: z.record(z.string(), z.unknown()),
        poster_keys: z.array(z.string()),
      }),
      run: async (c) => {
        const [row] = await db.insert(schema.campaigns).values({
          createdBy: ctx.userId, service: c.service, brief: c.brief, content: c.content, posterKeys: c.poster_keys,
        }).returning({ id: schema.campaigns.id });
        return json({ id: row.id, status: "draft" });
      },
    }),
  ],
};

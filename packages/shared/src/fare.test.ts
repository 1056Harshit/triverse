import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestedSeatPrice, maxSeatPrice, validateSeatPrice, busFareEstimate } from "./fare.ts";

const shimlaChd = { distanceKm: 113, tollsInr: 130, seats: 3, hillRoute: true };

test("suggested price splits cost between driver and passengers", () => {
  const p = suggestedSeatPrice(shimlaChd);
  assert.ok(p > 150 && p < 350, `got ${p}`);
});

test("cap blocks profit-making prices", () => {
  const max = maxSeatPrice(shimlaChd);
  assert.deepEqual(validateSeatPrice(shimlaChd, max + 50), { ok: false, max });
  assert.deepEqual(validateSeatPrice(shimlaChd, max), { ok: true });
});

test("volvo estimate is above a fair seat share", () => {
  assert.ok(busFareEstimate(113) > suggestedSeatPrice(shimlaChd));
});

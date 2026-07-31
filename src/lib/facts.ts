// Derived, build-time facts about a city or a city pair.
//
// Everything here is *computed* from the IANA database via luxon — no
// hand-written offsets, overlap counts, or "typical hours" claims. If a number
// appears on a page, it came out of this file or out of `schedule.ts`.

import { DateTime } from "luxon";
import { OFFSET_REFERENCE_YEAR, observesDst, type City } from "./cities";
import { DEFAULT_END, DEFAULT_START, inWindow, staticParticipant } from "./schedule";

// The calendar date every generated page computes against. Resolved once per
// build so all pages agree, and re-resolved on the next deploy — the pages state
// this date explicitly rather than implying "today".
export const BUILD_DATE: string = DateTime.now().toISODate() ?? "2026-01-01";

// Offset gap between two zones, in hours, at a given instant. Positive means
// `b` is ahead of `a`.
export function gapHours(a: City, b: City, dateISO: string): number {
  const at = DateTime.fromISO(dateISO, { zone: "utc" });
  const base = at.isValid ? at : DateTime.utc();
  const oa = base.setZone(a.tz).offset;
  const ob = base.setZone(b.tz).offset;
  return (ob - oa) / 60;
}

// The gap sampled across the whole reference year, so a page can say whether it
// holds all year or shifts with daylight saving.
export function gapRange(a: City, b: City): { min: number; max: number; varies: boolean } {
  const gaps: number[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const day of [1, 15]) {
      const at = DateTime.fromObject(
        { year: OFFSET_REFERENCE_YEAR, month, day, hour: 12 },
        { zone: "utc" },
      );
      gaps.push((at.setZone(b.tz).offset - at.setZone(a.tz).offset) / 60);
    }
  }
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  return { min, max, varies: min !== max };
}

// "5 hours", "5.5 hours", "12 hours" — hours may be fractional (IST, Kathmandu).
export function hoursPhrase(h: number): string {
  const abs = Math.abs(h);
  const n = Number.isInteger(abs) ? String(abs) : String(abs);
  return `${n} ${abs === 1 ? "hour" : "hours"}`;
}

// Count of half-hour cells where both cities are inside 9:00–17:00 local, on a
// given date. Returns hours, not cells.
export function overlapHours(a: City, b: City, dateISO: string): number {
  const pa = staticParticipant(a, a.name, 0);
  const pb = staticParticipant(b, b.name, 1);
  const base = DateTime.fromISO(dateISO, { zone: a.tz }).startOf("day");
  let cells = 0;
  for (let i = 0; i < 48; i++) {
    const inst = base.plus({ minutes: i * 30 });
    const la = inst.setZone(pa.city.tz);
    const lb = inst.setZone(pb.city.tz);
    if (
      inWindow(la.hour + la.minute / 60, DEFAULT_START, DEFAULT_END) &&
      inWindow(lb.hour + lb.minute / 60, DEFAULT_START, DEFAULT_END)
    ) {
      cells++;
    }
  }
  return cells / 2;
}

// One sentence on daylight saving for a pair, derived from whether either zone
// shifts and whether the gap between them actually changes as a result.
export function dstSentence(a: City, b: City): string {
  const range = gapRange(a, b);
  const aDst = observesDst(a.tz);
  const bDst = observesDst(b.tz);

  if (!aDst && !bDst) {
    return `Neither ${a.name} nor ${b.name} changes its clocks, so the ${hoursPhrase(
      range.min,
    )} gap between them holds all year.`;
  }
  if (!range.varies) {
    return `${aDst && bDst ? "Both cities change their clocks" : `${aDst ? a.name : b.name} changes its clocks`}, but the shifts line up — the gap stays at ${hoursPhrase(range.min)} all year.`;
  }
  return `The gap is not fixed: it moves between ${hoursPhrase(range.min)} and ${hoursPhrase(
    range.max,
  )} across the year, because ${
    aDst && bDst
      ? "the two cities switch to daylight saving on different dates"
      : `${aDst ? a.name : b.name} observes daylight saving and ${aDst ? b.name : a.name} does not`
  }. A time that worked in March can be an hour off in April — the planner uses each city's IANA rules for the exact date you pick, so it stays correct through the switch.`;
}

// One sentence on a single city's own clock.
export function citySentence(city: City, dateISO: string): string {
  const now = DateTime.fromISO(dateISO, { zone: city.tz });
  const base = now.isValid ? now : DateTime.now().setZone(city.tz);
  if (!observesDst(city.tz)) {
    return `${city.name} stays on the same offset all year — no daylight saving, so a meeting time agreed in January still means the same thing in July.`;
  }
  return `${city.name} observes daylight saving, so its offset from UTC changes twice a year. Any time you agree more than a few weeks out is worth re-checking against the actual date — which is what the planner does automatically, using ${
    base.zoneName
  } rather than a fixed offset.`;
}

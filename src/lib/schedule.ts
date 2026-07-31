// Pure meeting-slot scoring. Extracted from TimezoneTool so the React island
// and the static pSEO pages score identically — the numbers rendered into
// crawlable HTML at build time are the same ones the tool shows after hydration.
//
// Nothing here touches the DOM, localStorage, or `Math.random`, so it is safe
// to call from Astro frontmatter during `astro build`.

import { DateTime } from "luxon";
import type { City } from "./cities";

export type Participant = {
  id: string;
  name: string;
  city: City;
  start: number; // earliest available hour, 0-23
  end: number; // latest available hour, 1-24 (exclusive; may wrap past midnight)
};

export type PerPerson = { p: Participant; local: DateTime; penalty: number; inWork: boolean };
export type ScoredSlot = {
  iso: string;
  inst: DateTime;
  per: PerPerson[];
  total: number;
  variance: number;
};

// ── Scoring constants (source of truth: behaviour spec) ──────────────────────
export const LATE_NIGHT_PENALTY = 120; // added when a person's local hour is 11pm–6am
export const CELLS = 48; // 48 half-hour cells across the chosen 24h day
export const DEFAULT_START = 9;
export const DEFAULT_END = 17;

// Distance between two points on the 24h clock (shortest way round).
export function circDist(a: number, b: number) {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

// Is fractional local hour `h` inside the [start, end) window? Window may wrap midnight.
export function inWindow(h: number, start: number, end: number) {
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end; // wraps past midnight
}

// Hours from `h` to the nearest window edge (0 when inside the window).
export function distToWindow(h: number, start: number, end: number) {
  if (inWindow(h, start, end)) return 0;
  return Math.min(circDist(h, start), circDist(h, end % 24));
}

// Penalty for one person at one instant: 0 inside the window, else d² (+ late-night surcharge).
export function penaltyFor(local: DateTime, p: Participant) {
  const h = local.hour + local.minute / 60;
  if (inWindow(h, p.start, p.end)) return 0;
  const d = distToWindow(h, p.start, p.end);
  let pen = d * d;
  if (local.hour >= 23 || local.hour < 6) pen += LATE_NIGHT_PENALTY;
  return pen;
}

// Human time-of-day bucket for label generation.
export function bucket(local: DateTime, p: Participant): string {
  const h = local.hour + local.minute / 60;
  if (inWindow(h, p.start, p.end)) return "in hours";
  const hr = local.hour;
  if (hr >= 23 || hr < 6) return "the middle of the night";
  if (hr < 12) return "early morning";
  if (hr < 21) return "evening";
  return "late evening";
}

// Time-of-day colour palette, keyed on the local hour of the cell.
export function todColor(hour: number): string {
  if (hour < 5) return "hsl(234, 44%, 50%)"; // deep night
  if (hour < 8) return "hsl(18, 78%, 60%)"; // dawn
  if (hour < 12) return "hsl(43, 90%, 62%)"; // morning
  if (hour < 17) return "hsl(199, 74%, 60%)"; // midday
  if (hour < 20) return "hsl(28, 82%, 58%)"; // late afternoon
  if (hour < 22) return "hsl(270, 48%, 57%)"; // evening
  return "hsl(234, 44%, 50%)"; // night
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hourLabel(h: number) {
  const hh = ((h % 24) + 24) % 24;
  const ap = hh < 12 ? "AM" : "PM";
  let d = hh % 12;
  if (d === 0) d = 12;
  return `${d} ${ap}`;
}

// One-line label describing the human tradeoff of a slot.
export function slotLabel(s: ScoredSlot, count: number): string {
  const offenders = s.per.filter((x) => x.penalty > 0);
  if (offenders.length === 0) return "Everyone available";
  if (count === 2) {
    const [a, b] = s.per;
    return `${cap(bucket(a.local, a.p))} for ${a.p.name}, ${bucket(b.local, b.p)} for ${b.p.name}`;
  }
  const names = offenders.map((x) => x.p.name).join(", ");
  return `Good for ${count - offenders.length}, off-hours for ${names}`;
}

// Fairness tag: who, if anyone, takes the hit.
export function fairnessTag(s: ScoredSlot): string {
  const pens = s.per.map((x) => x.penalty);
  const max = Math.max(...pens);
  if (max === 0) return "Everyone comfortable";
  if (max - Math.min(...pens) < 30) return "Shared discomfort";
  const names = s.per
    .filter((x) => x.penalty === max)
    .map((x) => x.p.name)
    .join(", ");
  return `${names} take the hit`;
}

// Plain-text summary for the clipboard.
export function slotSummary(s: ScoredSlot): string {
  const date = s.per[0].local.toFormat("EEE, MMM d");
  const lines = s.per.map(
    (x) => `- ${x.p.name} · ${x.p.city.name} — ${x.local.toFormat("h:mm a")}`,
  );
  return `Meeting: ${date}\n${lines.join("\n")}`;
}

// ── Axis + ranking ───────────────────────────────────────────────────────────

// 48 half-hour instants across the chosen day, anchored in the first
// participant's zone. `dateISO` is a plain `YYYY-MM-DD` calendar date.
export function buildAxis(dateISO: string, anchorTz: string) {
  const parsed = DateTime.fromISO(dateISO, { zone: anchorTz });
  const base = (parsed.isValid ? parsed : DateTime.now().setZone(anchorTz)).startOf("day");
  const instants = Array.from({ length: CELLS }, (_, i) => base.plus({ minutes: i * 30 }));
  return { base, instants };
}

// Score every half-hour instant on the day, then return the top `limit` slots
// after collapsing entries that render as the same wall-clock time for everyone.
export function rankSlots(
  participants: Participant[],
  dateISO: string,
  limit = 5,
): ScoredSlot[] {
  const anchorTz = participants[0]?.city.tz ?? "UTC";
  const { instants } = buildAxis(dateISO, anchorTz);

  const scored: ScoredSlot[] = instants.map((inst) => {
    const per = participants.map((p) => {
      const local = inst.setZone(p.city.tz);
      const penalty = penaltyFor(local, p);
      return { p, local, penalty, inWork: penalty === 0 };
    });
    const total = per.reduce((a, x) => a + x.penalty, 0);
    const mean = total / per.length;
    const variance = per.reduce((a, x) => a + (x.penalty - mean) ** 2, 0) / per.length;
    return { iso: inst.toISO() ?? "", inst, per, total, variance };
  });

  scored.sort((a, b) => a.total - b.total || a.variance - b.variance);

  const seen = new Set<string>();
  const out: ScoredSlot[] = [];
  for (const s of scored) {
    const key = s.per.map((x) => x.local.toFormat("HH:mm")).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length === limit) break;
  }
  return out;
}

// Columns where every participant is simultaneously inside their window.
export function overlapMask(participants: Participant[], dateISO: string): boolean[] {
  const anchorTz = participants[0]?.city.tz ?? "UTC";
  const { instants } = buildAxis(dateISO, anchorTz);
  return instants.map((inst) =>
    participants.every((p) => {
      const l = inst.setZone(p.city.tz);
      return inWindow(l.hour + l.minute / 60, p.start, p.end);
    }),
  );
}

// Deterministic participant builder for static pages — no `Math.random`, so a
// rebuild of an unchanged page produces byte-identical HTML.
export function staticParticipant(
  city: City,
  name: string,
  index: number,
  start = DEFAULT_START,
  end = DEFAULT_END,
): Participant {
  return { id: `p${index}`, name, city, start, end };
}

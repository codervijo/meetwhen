import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { DateTime } from "luxon";
import { CITIES, type City } from "../lib/cities";

type Participant = {
  id: string;
  name: string;
  city: City;
  start: number; // earliest available hour, 0-23
  end: number; // latest available hour, 1-24 (exclusive; may wrap past midnight)
};

type PerPerson = { p: Participant; local: DateTime; penalty: number; inWork: boolean };
type ScoredSlot = { iso: string; inst: DateTime; per: PerPerson[]; total: number; variance: number };

// ── Scoring constants (source of truth: behaviour spec) ──────────────────────
const LATE_NIGHT_PENALTY = 120; // added when a person's local hour is 11pm–6am
const CELLS = 48; // 48 half-hour cells across the chosen 24h day
const STORAGE_KEY = "meetwhen.setup.v1";

const newId = () => Math.random().toString(36).slice(2, 9);

function findCity(tz: string, name: string): City {
  return (
    CITIES.find((c) => c.tz === tz && c.name === name) ??
    CITIES.find((c) => c.tz === tz) ??
    CITIES[0]
  );
}

// Distance between two points on the 24h clock (shortest way round).
function circDist(a: number, b: number) {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

// Is fractional local hour `h` inside the [start, end) window? Window may wrap midnight.
function inWindow(h: number, start: number, end: number) {
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end; // wraps past midnight
}

// Hours from `h` to the nearest window edge (0 when inside the window).
function distToWindow(h: number, start: number, end: number) {
  if (inWindow(h, start, end)) return 0;
  return Math.min(circDist(h, start), circDist(h, end % 24));
}

// Penalty for one person at one instant: 0 inside the window, else d² (+ late-night surcharge).
function penaltyFor(local: DateTime, p: Participant) {
  const h = local.hour + local.minute / 60;
  if (inWindow(h, p.start, p.end)) return 0;
  const d = distToWindow(h, p.start, p.end);
  let pen = d * d;
  if (local.hour >= 23 || local.hour < 6) pen += LATE_NIGHT_PENALTY;
  return pen;
}

// Human time-of-day bucket for label generation.
function bucket(local: DateTime, p: Participant): string {
  const h = local.hour + local.minute / 60;
  if (inWindow(h, p.start, p.end)) return "in hours";
  const hr = local.hour;
  if (hr >= 23 || hr < 6) return "the middle of the night";
  if (hr < 12) return "early morning";
  if (hr < 21) return "evening";
  return "late evening";
}

// Time-of-day colour palette, keyed on the local hour of the cell.
function todColor(hour: number): string {
  if (hour < 5) return "hsl(234, 44%, 50%)"; // deep night
  if (hour < 8) return "hsl(18, 78%, 60%)"; // dawn
  if (hour < 12) return "hsl(43, 90%, 62%)"; // morning
  if (hour < 17) return "hsl(199, 74%, 60%)"; // midday
  if (hour < 20) return "hsl(28, 82%, 58%)"; // late afternoon
  if (hour < 22) return "hsl(270, 48%, 57%)"; // evening
  return "hsl(234, 44%, 50%)"; // night
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hourLabel(h: number) {
  const hh = ((h % 24) + 24) % 24;
  const ap = hh < 12 ? "AM" : "PM";
  let d = hh % 12;
  if (d === 0) d = 12;
  return `${d} ${ap}`;
}

// One-line label describing the human tradeoff of a slot.
function slotLabel(s: ScoredSlot, count: number): string {
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
function fairnessTag(s: ScoredSlot): string {
  const pens = s.per.map((x) => x.penalty);
  const max = Math.max(...pens);
  if (max === 0) return "Everyone comfortable";
  if (max - Math.min(...pens) < 30) return "Shared discomfort";
  const names = s.per.filter((x) => x.penalty === max).map((x) => x.p.name).join(", ");
  return `${names} take the hit`;
}

// Plain-text summary for the clipboard.
function slotSummary(s: ScoredSlot): string {
  const date = s.per[0].local.toFormat("EEE, MMM d");
  const lines = s.per.map(
    (x) => `- ${x.p.name} · ${x.p.city.name} — ${x.local.toFormat("h:mm a")}`,
  );
  return `Meeting: ${date}\n${lines.join("\n")}`;
}

// Pin / badge colour by rank (best green, top-3 indigo, rest gray).
function rankColor(rank: number) {
  if (rank === 0) return { bg: "#059669", ring: "#10b981" }; // emerald
  if (rank <= 2) return { bg: "#4f46e5", ring: "#6366f1" }; // indigo
  return { bg: "#6b7280", ring: "#9ca3af" }; // gray
}

const DEFAULT_PARTICIPANTS = (): Participant[] => [
  { id: newId(), name: "Me", city: findCity("America/Los_Angeles", "San Francisco"), start: 9, end: 17 },
  { id: newId(), name: "Person 2", city: findCity("Europe/London", "London"), start: 9, end: 17 },
];

// Detect the visitor's city from their IANA timezone. Prefers an exact tz match,
// then the nearest city sharing the same current UTC offset, then SF.
function detectCity(): City {
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return CITIES[0];
  }
  if (!tz) return CITIES[0];
  const exact = CITIES.find((c) => c.tz === tz);
  if (exact) return exact;
  const here = DateTime.now().setZone(tz);
  if (here.isValid) {
    const sameOffset = CITIES.find((c) => DateTime.now().setZone(c.tz).offset === here.offset);
    if (sameOffset) return sameOffset;
  }
  return CITIES[0];
}

export default function TimezoneTool() {
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [date, setDate] = useState<string>(() => DateTime.now().toISODate() ?? "2026-01-01");
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const loaded = useRef(false);

  // ── Persistence: restore setup from localStorage on first mount ────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s?.participants) && s.participants.length >= 2) {
          setParticipants(
            s.participants.slice(0, 8).map((x: any) => ({
              id: newId(),
              name: String(x.name ?? "Person"),
              city: findCity(String(x.tz), String(x.cityName)),
              start: Number.isFinite(x.start) ? x.start : 9,
              end: Number.isFinite(x.end) ? x.end : 17,
            })),
          );
          if (typeof s.date === "string" && DateTime.fromISO(s.date).isValid) setDate(s.date);
          loaded.current = true;
          return;
        }
      }
    } catch {
      // Corrupt / unavailable storage — fall through to fresh defaults.
    }
    // No saved setup: pre-fill the first person from the visitor's timezone.
    const detected = detectCity();
    setParticipants((ps) => ps.map((p, i) => (i === 0 ? { ...p, city: detected } : p)));
    loaded.current = true;
  }, []);

  // Persist on every change (skipped until the initial restore has run).
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date,
          participants: participants.map((p) => ({
            name: p.name,
            tz: p.city.tz,
            cityName: p.city.name,
            start: p.start,
            end: p.end,
          })),
        }),
      );
    } catch {
      // Storage full / blocked — setup just won't survive refresh.
    }
  }, [participants, date]);

  // ── Aligned axis: 48 half-hour instants across the chosen day in P1's zone ─
  const anchorTz = participants[0]?.city.tz ?? "UTC";
  const axis = useMemo(() => {
    const parsed = DateTime.fromISO(date, { zone: anchorTz });
    const base = (parsed.isValid ? parsed : DateTime.now().setZone(anchorTz)).startOf("day");
    const instants = Array.from({ length: CELLS }, (_, i) => base.plus({ minutes: i * 30 }));
    return { base, instants };
  }, [date, anchorTz]);

  // Columns where every participant is simultaneously inside their window.
  const allFree = useMemo(
    () =>
      axis.instants.map((inst) =>
        participants.every((p) => {
          const l = inst.setZone(p.city.tz);
          return inWindow(l.hour + l.minute / 60, p.start, p.end);
        }),
      ),
    [axis, participants],
  );

  // ── Ranked slots: scan the day, score the tradeoff, dedupe, top 5 ──────────
  const ranked = useMemo(() => {
    const scored: ScoredSlot[] = axis.instants.map((inst) => {
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
      if (out.length === 5) break;
    }
    return out;
  }, [axis, participants]);

  // Reset the selection to the top slot whenever inputs change.
  const sig =
    participants.map((p) => `${p.id}:${p.city.tz}:${p.start}-${p.end}`).join("|") + "@" + date;
  useEffect(() => {
    setSelectedIso(null);
  }, [sig]);

  const selected = ranked.find((s) => s.iso === selectedIso) ?? ranked[0] ?? null;
  const cleanOverlap = ranked.some((s) => s.total === 0);

  // Half-hour column index of an instant within the axis (or null if off-axis).
  const colOf = (inst: DateTime) => {
    const idx = Math.round(inst.diff(axis.base, "minutes").minutes / 30);
    return idx >= 0 && idx < CELLS ? idx : null;
  };
  const pctOf = (idx: number) => ((idx + 0.5) / CELLS) * 100;
  const selCol = selected ? colOf(selected.inst) : null;
  const selPct = selCol !== null ? pctOf(selCol) : null;

  const updateParticipant = (id: string, patch: Partial<Participant>) =>
    setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addParticipant = () => {
    if (participants.length >= 8) return;
    setParticipants((ps) => [
      ...ps,
      {
        id: newId(),
        name: `Person ${ps.length + 1}`,
        city: findCity("America/New_York", "New York"),
        start: 9,
        end: 17,
      },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants((ps) => ps.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Participants */}
      <section className="space-y-3" aria-label="Participants">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Participants
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground" htmlFor="meeting-date">
              Meeting date
            </label>
            <input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              onClick={addParticipant}
              disabled={participants.length >= 8}
              className="text-sm px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add participant
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              canRemove={participants.length > 2}
              onChange={(patch) => updateParticipant(p.id, patch)}
              onRemove={() => removeParticipant(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Suggested slots */}
      <section className="space-y-3" aria-label="Suggested meeting slots">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Best meeting slots
        </h2>
        {!cleanOverlap && (
          <p
            role="status"
            className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2"
          >
            No time works for everyone on this day — the slots below are the fairest tradeoffs.
            Try another date or widening someone's hours.
          </p>
        )}
        <ul className="space-y-2">
          {ranked.map((s, rank) => {
            const isSelected = selected?.iso === s.iso;
            const rc = rankColor(rank);
            return (
              <li key={s.iso} className="relative">
                <button
                  onClick={() => setSelectedIso(s.iso)}
                  aria-pressed={isSelected}
                  aria-label={`Slot ${rank + 1}: ${slotLabel(s, participants.length)}. ${fairnessTag(s)}.`}
                  className={`w-full text-left rounded-lg border p-3 pl-12 transition-colors ${
                    isSelected
                      ? "border-foreground bg-accent ring-1 ring-foreground"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute left-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: rc.bg }}
                  >
                    {rank + 1}
                  </span>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2 pr-24">
                    <span className="text-sm font-medium">{slotLabel(s, participants.length)}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.per[0].local.toFormat("EEE, MMM d")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.total === 0
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {fairnessTag(s)}
                    </span>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {s.per.map((x) => (
                      <div key={x.p.id} className="flex items-center justify-between text-sm gap-3">
                        <span className="text-muted-foreground truncate">
                          {x.p.name} · {x.p.city.name}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            x.inWork ? "text-foreground" : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {x.local.toFormat("h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
                <CopyButton text={slotSummary(s)} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Timelines */}
      <section className="space-y-3" aria-label="Local timelines">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Local timelines — {axis.base.toFormat("EEE, MMM d")}
          </h2>
          <p className="text-xs text-muted-foreground">
            Each row is one person's 24h day, aligned to the same instants. Times are labelled in
            each person's own timezone.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Pins row */}
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <div />
              <div className="relative h-7">
                {ranked.map((s, rank) => {
                  const col = colOf(s.inst);
                  if (col === null) return null;
                  const rc = rankColor(rank);
                  const isSel = selected?.iso === s.iso;
                  return (
                    <button
                      key={s.iso}
                      onClick={() => setSelectedIso(s.iso)}
                      aria-pressed={isSel}
                      aria-label={`Select slot ${rank + 1} at ${s.per[0].local.toFormat("h:mm a")}`}
                      className="absolute top-0 -translate-x-1/2 flex items-center justify-center rounded-full font-semibold text-white transition-transform"
                      style={{
                        left: `${pctOf(col)}%`,
                        backgroundColor: rc.bg,
                        boxShadow: isSel ? `0 0 0 2px var(--color-card), 0 0 0 4px ${rc.ring}` : "none",
                        width: isSel ? 24 : 18,
                        height: isSel ? 24 : 18,
                        fontSize: isSel ? 12 : 10,
                        zIndex: isSel ? 2 : 1,
                      }}
                    >
                      {rank + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* One strip per participant */}
            <div className="space-y-2 mt-1">
              {participants.map((p) => (
                <TimelineStrip
                  key={p.id}
                  participant={p}
                  instants={axis.instants}
                  allFree={allFree}
                  selPct={selPct}
                />
              ))}
            </div>

            <Legend />
          </div>
        </div>
      </section>
    </div>
  );
}

function ParticipantCard({
  participant,
  canRemove,
  onChange,
  onRemove,
}: {
  participant: Participant;
  canRemove: boolean;
  onChange: (p: Partial<Participant>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`name-${participant.id}`}>
          Name
        </label>
        <input
          id={`name-${participant.id}`}
          value={participant.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 bg-transparent border-b border-border focus:border-foreground outline-none text-sm py-1"
        />
        {canRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${participant.name}`}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Remove
          </button>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground" htmlFor={`city-${participant.id}`}>
          City / timezone
        </label>
        <select
          id={`city-${participant.id}`}
          value={`${participant.city.name}|${participant.city.tz}`}
          onChange={(e) => {
            const [name, tz] = e.target.value.split("|");
            onChange({ city: findCity(tz, name) });
          }}
          className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          {CITIES.map((c) => (
            <option key={`${c.name}|${c.tz}`} value={`${c.name}|${c.tz}`}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor={`ws-${participant.id}`}>
            Available from
          </label>
          <select
            id={`ws-${participant.id}`}
            value={participant.start}
            onChange={(e) => onChange({ start: Number(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {hourLabel(i)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor={`we-${participant.id}`}>
            Available to
          </label>
          <select
            id={`we-${participant.id}`}
            value={participant.end}
            onChange={(e) => onChange({ end: Number(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
              <option key={i} value={i}>
                {hourLabel(i)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function TimelineStrip({
  participant,
  instants,
  allFree,
  selPct,
}: {
  participant: Participant;
  instants: DateTime[];
  allFree: boolean[];
  selPct: number | null;
}) {
  const locals = instants.map((inst) => inst.setZone(participant.city.tz));
  // Ticks at the person's own 12am / 6am / 12pm / 6pm, plus a hint of the day rollover.
  const ticks = locals
    .map((l, i) =>
      l.minute === 0 && [0, 6, 12, 18].includes(l.hour)
        ? { pct: ((i + 0.5) / instants.length) * 100, label: hourLabel(l.hour).replace(" ", "").toLowerCase() }
        : null,
    )
    .filter(Boolean) as { pct: number; label: string }[];

  const ariaLabel = `${participant.name} in ${participant.city.name}: available ${hourLabel(
    participant.start,
  )} to ${hourLabel(participant.end)} local time.`;

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-stretch">
      <div className="min-w-0 self-center">
        <div className="text-sm font-medium truncate">{participant.name}</div>
        <div className="text-xs text-muted-foreground truncate">{participant.city.name}</div>
      </div>
      <div>
        <div
          className="relative h-9 rounded-md overflow-hidden"
          role="img"
          aria-label={ariaLabel}
        >
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${instants.length}, minmax(0, 1fr))` }}
          >
            {locals.map((local, i) => {
              const h = local.hour + local.minute / 60;
              const inW = inWindow(h, participant.start, participant.end);
              const midnight = local.hour === 0 && local.minute === 0;
              return (
                <div
                  key={i}
                  title={`${local.toFormat("ccc h:mm a")}`}
                  className={midnight ? "border-l-2 border-l-foreground/60" : "border-l border-l-background/25"}
                  style={{
                    backgroundColor: todColor(local.hour),
                    opacity: inW ? 1 : 0.28,
                    boxShadow: allFree[i] ? "inset 0 0 0 2px var(--color-foreground)" : undefined,
                  }}
                />
              );
            })}
          </div>
          {/* Selected-slot marker through every strip */}
          {selPct !== null && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-foreground"
              style={{ left: `${selPct}%` }}
              aria-hidden
            />
          )}
        </div>
        {/* Own-local-time labels underneath */}
        <div className="relative h-4 mt-0.5 text-[10px] font-mono text-muted-foreground">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${t.pct}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const items: [string, number][] = [
    ["Night", 2],
    ["Dawn", 6],
    ["Morning", 10],
    ["Midday", 14],
    ["Evening", 18],
    ["Late", 21],
  ];
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 mt-3">
      <div />
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        {items.map(([label, hour]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: todColor(hour) }}
            />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted ring-2 ring-inset ring-foreground" />
          Everyone free
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted opacity-30" />
          Off-hours
        </span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — leave the label unchanged.
    }
  };

  return (
    <button
      onClick={copy}
      aria-label="Copy meeting time"
      className="absolute top-3 right-3 z-10 text-xs px-2 py-1 rounded-md border border-border bg-card hover:bg-accent transition-colors"
    >
      {copied ? "Copied!" : "Copy time"}
    </button>
  );
}

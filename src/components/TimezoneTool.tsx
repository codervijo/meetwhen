import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { DateTime } from "luxon";
import { CITIES, type City } from "../lib/cities";

type Participant = {
  id: string;
  name: string;
  city: City;
  workStart: number; // hour 0-23
  workEnd: number; // hour 1-24
};

type SlotParticipant = { participant: Participant; local: DateTime; inWork: boolean };
type ScoredSlot = { slot: DateTime; perParticipant: SlotParticipant[]; inCount: number; midScore: number };

const newId = () => Math.random().toString(36).slice(2, 9);

function findCity(tz: string, name: string): City {
  return CITIES.find((c) => c.tz === tz && c.name === name) ?? CITIES[0];
}

// Detect the visitor's city from their IANA timezone. Prefers an exact tz match,
// then falls back to the nearest city sharing the same current UTC offset, then SF.
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

// Clean, shareable plain-text summary of a slot for the clipboard.
function slotSummary(s: ScoredSlot): string {
  const date = s.slot.setZone(s.perParticipant[0].participant.city.tz).toFormat("EEE, MMM d");
  const lines = s.perParticipant.map(
    (x) => `- ${x.participant.name} · ${x.participant.city.name} — ${x.local.toFormat("HH:mm")}`,
  );
  return `Meeting: ${date}\n${lines.join("\n")}`;
}

const DEFAULT_PARTICIPANTS = (): Participant[] => [
  { id: newId(), name: "Me", city: findCity("America/Los_Angeles", "San Francisco"), workStart: 9, workEnd: 17 },
  { id: newId(), name: "Person 2", city: findCity("Europe/London", "London"), workStart: 9, workEnd: 17 },
];

// Reference instant: now. All hours computed off this.
function getHourSlots(refUtc: DateTime) {
  // 24 hourly slots anchored to current UTC hour
  const start = refUtc.startOf("hour");
  return Array.from({ length: 24 }, (_, i) => start.plus({ hours: i }));
}

function isWithinWork(localHour: number, start: number, end: number) {
  // end is exclusive boundary (e.g., 9-17 means hours 9..16 inclusive)
  if (start < end) return localHour >= start && localHour < end;
  // overnight
  return localHour >= start || localHour < end;
}

export default function TimezoneTool() {
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [nowTick] = useState(() => DateTime.utc());

  // On first load, pre-select Person 1's city from the visitor's local timezone.
  // Runs after hydration to avoid an SSR/client mismatch on the default (SF).
  useEffect(() => {
    const detected = detectCity();
    setParticipants((ps) =>
      ps.length === 0 || ps[0].city.tz === detected.tz
        ? ps
        : ps.map((p, i) => (i === 0 ? { ...p, city: detected } : p)),
    );
  }, []);

  // Build 48 half-hour candidate slots starting from "now" rounded down
  const refUtc = useMemo(() => nowTick.startOf("hour"), [nowTick]);
  const hourSlots = useMemo(() => getHourSlots(refUtc), [refUtc]);

  // Candidate slots for suggestions: next 48 hours, every 30 min
  const candidates = useMemo(() => {
    const slots: DateTime[] = [];
    for (let i = 0; i < 96; i++) slots.push(refUtc.plus({ minutes: i * 30 }));
    return slots;
  }, [refUtc]);

  const scoredSlots = useMemo(() => {
    const scored = candidates.map((slot) => {
      const perParticipant = participants.map((p) => {
        const local = slot.setZone(p.city.tz);
        const hour = local.hour + local.minute / 60;
        const inWork = isWithinWork(Math.floor(hour), p.workStart, p.workEnd);
        return { participant: p, local, inWork };
      });
      const inCount = perParticipant.filter((x) => x.inWork).length;
      // distance from middle of work hours (averaged) — prefer mid-day
      const midScore =
        perParticipant.reduce((acc, x) => {
          const mid = (x.participant.workStart + x.participant.workEnd) / 2;
          const h = x.local.hour + x.local.minute / 60;
          return acc + Math.abs(h - mid);
        }, 0) / perParticipant.length;
      return { slot, perParticipant, inCount, midScore };
    });
    scored.sort((a, b) => {
      if (b.inCount !== a.inCount) return b.inCount - a.inCount;
      return a.midScore - b.midScore;
    });
    // dedupe by inCount cluster, return top 8
    return scored.slice(0, 8);
  }, [candidates, participants]);

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
        workStart: 9,
        workEnd: 17,
      },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants((ps) => ps.filter((p) => p.id !== id));
  };

  const selectedSlot = selectedSlotIso ? DateTime.fromISO(selectedSlotIso, { zone: "utc" }) : null;

  return (
    <div className="space-y-8">
      {/* Participants */}
      <section className="space-y-3" aria-label="Participants">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Participants
          </h2>
          <button
            onClick={addParticipant}
            disabled={participants.length >= 8}
            className="text-sm px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add participant
          </button>
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
          Suggested meeting slots
        </h2>
        <ul className="space-y-2">
          {scoredSlots.map((s) => {
            const everyone = s.inCount === participants.length;
            const isSelected = selectedSlotIso === s.slot.toISO();
            return (
              <li key={s.slot.toISO()} className="relative">
                <button
                  onClick={() => setSelectedSlotIso(s.slot.toISO())}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-foreground bg-accent"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2 pr-24">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        everyone
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {everyone
                        ? "Everyone in working hours"
                        : `${s.inCount}/${participants.length} in working hours — tradeoff`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.slot.setZone(participants[0].city.tz).toFormat("EEE, MMM d")}
                    </span>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {s.perParticipant.map((x) => (
                      <div
                        key={x.participant.id}
                        className="flex items-center justify-between text-sm gap-3"
                      >
                        <span className="text-muted-foreground truncate">
                          {x.participant.name} · {x.participant.city.name}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            x.inWork ? "text-foreground" : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {x.local.toFormat("HH:mm")}
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
      <section className="space-y-3" aria-label="Timelines">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Local timelines — next 24 hours
          </h2>
          <p className="text-xs text-muted-foreground">All times shown in each person's local timezone.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
          <div className="min-w-[640px] space-y-2">
            <HourAxis hourSlots={hourSlots} />
            {participants.map((p) => (
              <TimelineRow
                key={p.id}
                participant={p}
                hourSlots={hourSlots}
                nowUtc={nowTick}
                selectedSlot={selectedSlot}
              />
            ))}
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
        <label className="sr-only" htmlFor={`name-${participant.id}`}>Name</label>
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
            Work starts
          </label>
          <select
            id={`ws-${participant.id}`}
            value={participant.workStart}
            onChange={(e) => onChange({ workStart: Number(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor={`we-${participant.id}`}>
            Work ends
          </label>
          <select
            id={`we-${participant.id}`}
            value={participant.workEnd}
            onChange={(e) => onChange({ workEnd: Number(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
              <option key={i} value={i}>{String(i % 24).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts / older browsers.
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

function HourAxis({ hourSlots }: { hourSlots: DateTime[] }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
      <div />
      <div className="grid grid-cols-24 text-[10px] text-muted-foreground font-mono"
        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {hourSlots.map((h, i) => (
          <div key={i} className="text-center">
            {i % 3 === 0 ? h.toUTC().toFormat("HH") + "Z" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({
  participant,
  hourSlots,
  nowUtc,
  selectedSlot,
}: {
  participant: Participant;
  hourSlots: DateTime[];
  nowUtc: DateTime;
  selectedSlot: DateTime | null;
}) {
  const startUtc = hourSlots[0];
  const totalMin = 24 * 60;
  const nowPct = Math.max(0, Math.min(100, (nowUtc.diff(startUtc, "minutes").minutes / totalMin) * 100));
  const selPct =
    selectedSlot && selectedSlot >= startUtc && selectedSlot <= startUtc.plus({ hours: 24 })
      ? (selectedSlot.diff(startUtc, "minutes").minutes / totalMin) * 100
      : null;

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{participant.name}</div>
        <div className="text-xs text-muted-foreground truncate">{participant.city.name}</div>
      </div>
      <div className="relative h-10 rounded-md bg-muted overflow-hidden">
        {/* hour cells */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {hourSlots.map((h, i) => {
            const local = h.setZone(participant.city.tz);
            const inWork = isWithinWork(local.hour, participant.workStart, participant.workEnd);
            return (
              <div
                key={i}
                className={`border-r border-background/40 last:border-r-0 flex items-center justify-center text-[10px] font-mono ${
                  inWork ? "bg-emerald-500/25 text-foreground" : "text-muted-foreground"
                }`}
                title={`${local.toFormat("ccc HH:mm ZZZZ")}`}
              >
                {local.hour === 0 ? local.toFormat("MMM d") : local.hour}
              </div>
            );
          })}
        </div>
        {/* now marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/70"
          style={{ left: `${nowPct}%` }}
          aria-hidden
        />
        {/* selected marker */}
        {selPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
            style={{ left: `${selPct}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

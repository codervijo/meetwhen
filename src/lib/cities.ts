import { DateTime } from "luxon";

export type City = {
  name: string;
  tz: string;
  label: string;
  slug: string;
  country: string;
};

export const CITIES: City[] = [
  { name: "San Francisco", tz: "America/Los_Angeles", label: "San Francisco (PT)", slug: "san-francisco", country: "United States" },
  { name: "Los Angeles", tz: "America/Los_Angeles", label: "Los Angeles (PT)", slug: "los-angeles", country: "United States" },
  { name: "Denver", tz: "America/Denver", label: "Denver (MT)", slug: "denver", country: "United States" },
  { name: "Chicago", tz: "America/Chicago", label: "Chicago (CT)", slug: "chicago", country: "United States" },
  { name: "New York", tz: "America/New_York", label: "New York (ET)", slug: "new-york", country: "United States" },
  { name: "Toronto", tz: "America/Toronto", label: "Toronto", slug: "toronto", country: "Canada" },
  { name: "Mexico City", tz: "America/Mexico_City", label: "Mexico City", slug: "mexico-city", country: "Mexico" },
  { name: "São Paulo", tz: "America/Sao_Paulo", label: "São Paulo", slug: "sao-paulo", country: "Brazil" },
  { name: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", label: "Buenos Aires", slug: "buenos-aires", country: "Argentina" },
  { name: "London", tz: "Europe/London", label: "London", slug: "london", country: "United Kingdom" },
  { name: "Dublin", tz: "Europe/Dublin", label: "Dublin", slug: "dublin", country: "Ireland" },
  { name: "Lisbon", tz: "Europe/Lisbon", label: "Lisbon", slug: "lisbon", country: "Portugal" },
  { name: "Paris", tz: "Europe/Paris", label: "Paris", slug: "paris", country: "France" },
  { name: "Berlin", tz: "Europe/Berlin", label: "Berlin", slug: "berlin", country: "Germany" },
  { name: "Amsterdam", tz: "Europe/Amsterdam", label: "Amsterdam", slug: "amsterdam", country: "Netherlands" },
  { name: "Madrid", tz: "Europe/Madrid", label: "Madrid", slug: "madrid", country: "Spain" },
  { name: "Rome", tz: "Europe/Rome", label: "Rome", slug: "rome", country: "Italy" },
  { name: "Stockholm", tz: "Europe/Stockholm", label: "Stockholm", slug: "stockholm", country: "Sweden" },
  { name: "Warsaw", tz: "Europe/Warsaw", label: "Warsaw", slug: "warsaw", country: "Poland" },
  { name: "Athens", tz: "Europe/Athens", label: "Athens", slug: "athens", country: "Greece" },
  { name: "Istanbul", tz: "Europe/Istanbul", label: "Istanbul", slug: "istanbul", country: "Türkiye" },
  { name: "Moscow", tz: "Europe/Moscow", label: "Moscow", slug: "moscow", country: "Russia" },
  { name: "Cairo", tz: "Africa/Cairo", label: "Cairo", slug: "cairo", country: "Egypt" },
  { name: "Lagos", tz: "Africa/Lagos", label: "Lagos", slug: "lagos", country: "Nigeria" },
  { name: "Johannesburg", tz: "Africa/Johannesburg", label: "Johannesburg", slug: "johannesburg", country: "South Africa" },
  { name: "Nairobi", tz: "Africa/Nairobi", label: "Nairobi", slug: "nairobi", country: "Kenya" },
  { name: "Dubai", tz: "Asia/Dubai", label: "Dubai", slug: "dubai", country: "United Arab Emirates" },
  { name: "Tel Aviv", tz: "Asia/Jerusalem", label: "Tel Aviv", slug: "tel-aviv", country: "Israel" },
  { name: "Riyadh", tz: "Asia/Riyadh", label: "Riyadh", slug: "riyadh", country: "Saudi Arabia" },
  { name: "Karachi", tz: "Asia/Karachi", label: "Karachi", slug: "karachi", country: "Pakistan" },
  { name: "Mumbai", tz: "Asia/Kolkata", label: "Mumbai (IST)", slug: "mumbai", country: "India" },
  { name: "Bangalore", tz: "Asia/Kolkata", label: "Bangalore (IST)", slug: "bangalore", country: "India" },
  { name: "Delhi", tz: "Asia/Kolkata", label: "Delhi (IST)", slug: "delhi", country: "India" },
  { name: "Dhaka", tz: "Asia/Dhaka", label: "Dhaka", slug: "dhaka", country: "Bangladesh" },
  { name: "Bangkok", tz: "Asia/Bangkok", label: "Bangkok", slug: "bangkok", country: "Thailand" },
  { name: "Jakarta", tz: "Asia/Jakarta", label: "Jakarta", slug: "jakarta", country: "Indonesia" },
  { name: "Singapore", tz: "Asia/Singapore", label: "Singapore", slug: "singapore", country: "Singapore" },
  { name: "Hong Kong", tz: "Asia/Hong_Kong", label: "Hong Kong", slug: "hong-kong", country: "Hong Kong SAR" },
  { name: "Shanghai", tz: "Asia/Shanghai", label: "Shanghai", slug: "shanghai", country: "China" },
  { name: "Beijing", tz: "Asia/Shanghai", label: "Beijing", slug: "beijing", country: "China" },
  { name: "Taipei", tz: "Asia/Taipei", label: "Taipei", slug: "taipei", country: "Taiwan" },
  { name: "Seoul", tz: "Asia/Seoul", label: "Seoul", slug: "seoul", country: "South Korea" },
  { name: "Tokyo", tz: "Asia/Tokyo", label: "Tokyo", slug: "tokyo", country: "Japan" },
  { name: "Sydney", tz: "Australia/Sydney", label: "Sydney", slug: "sydney", country: "Australia" },
  { name: "Melbourne", tz: "Australia/Melbourne", label: "Melbourne", slug: "melbourne", country: "Australia" },
  { name: "Perth", tz: "Australia/Perth", label: "Perth", slug: "perth", country: "Australia" },
  { name: "Auckland", tz: "Pacific/Auckland", label: "Auckland", slug: "auckland", country: "New Zealand" },
  { name: "Honolulu", tz: "Pacific/Honolulu", label: "Honolulu", slug: "honolulu", country: "United States" },
];

export const CITY_BY_SLUG: Map<string, City> = new Map(CITIES.map((c) => [c.slug, c]));

export function cityBySlug(slug: string): City | undefined {
  return CITY_BY_SLUG.get(slug);
}

// ── Offset profile ───────────────────────────────────────────────────────────
//
// Two cities whose UTC offset agrees on every day of the year produce identical
// meeting maths — Toronto and New York, or Berlin and Paris. Pair pages for both
// would be duplicate content, so hub selection dedupes on this computed
// signature rather than on a hand-maintained exclusion list.
//
// The reference year is pinned so the generated URL set is stable across builds;
// an unpinned "current year" would silently reshuffle routes every January.
export const OFFSET_REFERENCE_YEAR = 2026;

// Sample the offset on the 1st and 15th of each month — enough resolution to
// separate zones that differ only in when their DST transitions land.
export function offsetSignature(tz: string): string {
  const samples: number[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const day of [1, 15]) {
      samples.push(
        DateTime.fromObject(
          { year: OFFSET_REFERENCE_YEAR, month, day, hour: 12 },
          { zone: tz },
        ).offset,
      );
    }
  }
  return samples.join(",");
}

// Human-readable UTC offset for a city on a given calendar date, e.g. "UTC+5:30".
export function utcOffsetLabel(tz: string, dateISO: string): string {
  const dt = DateTime.fromISO(dateISO, { zone: tz });
  const base = dt.isValid ? dt : DateTime.now().setZone(tz);
  const mins = base.offset;
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

// Does this zone shift its clock at all during the reference year?
export function observesDst(tz: string): boolean {
  return new Set(offsetSignature(tz).split(",")).size > 1;
}

// ── Hub selection ────────────────────────────────────────────────────────────
//
// Candidates are the major business / remote-work hubs, roughly ordered by how
// often they show up in cross-timezone scheduling. The list is then deduped by
// offset signature: the first candidate claiming a signature wins and later
// cities sharing it drop out of the *pair* matrix. Every city still gets its own
// hub page — only the N×N pair pages are deduped.
const HUB_CANDIDATE_SLUGS = [
  "san-francisco",
  "new-york",
  "chicago",
  "denver",
  "london",
  "paris",
  "berlin",
  "mexico-city",
  "sao-paulo",
  "athens",
  "moscow",
  "lagos",
  "johannesburg",
  "dubai",
  "karachi",
  "mumbai",
  "dhaka",
  "bangkok",
  "singapore",
  "shanghai",
  "tokyo",
  "sydney",
  "auckland",
  "honolulu",
  "cairo",
  "tel-aviv",
  "istanbul",
  "toronto",
  "hong-kong",
  "seoul",
];

// Cities used to build the pair matrix — distinct offset profiles only.
export const HUB_CITIES: City[] = (() => {
  const seen = new Set<string>();
  const out: City[] = [];
  for (const slug of HUB_CANDIDATE_SLUGS) {
    const city = CITY_BY_SLUG.get(slug);
    if (!city) continue;
    const sig = offsetSignature(city.tz);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(city);
  }
  return out;
})();

export type CityPair = { a: City; b: City };

// Every unordered hub pair, emitted in one canonical direction only so
// /meet/london/tokyo/ exists and /meet/tokyo/london/ does not.
export const HUB_PAIRS: CityPair[] = (() => {
  const out: CityPair[] = [];
  for (let i = 0; i < HUB_CITIES.length; i++) {
    for (let j = i + 1; j < HUB_CITIES.length; j++) {
      out.push({ a: HUB_CITIES[i], b: HUB_CITIES[j] });
    }
  }
  return out;
})();

// Pair pages that exist for a given city, for internal linking from its hub page.
export function pairsFor(city: City): CityPair[] {
  return HUB_PAIRS.filter((p) => p.a.slug === city.slug || p.b.slug === city.slug);
}

// The canonical pair-page path for two cities, or null when the pair has no page.
export function pairPath(a: City, b: City): string | null {
  const hit = HUB_PAIRS.find(
    (p) =>
      (p.a.slug === a.slug && p.b.slug === b.slug) ||
      (p.a.slug === b.slug && p.b.slug === a.slug),
  );
  return hit ? `/meet/${hit.a.slug}/${hit.b.slug}/` : null;
}

// The hub city whose clock matches this one, used to point non-hub cities at the
// pair matrix ("Berlin keeps the same clock as Paris — see Paris pairs").
export function hubTwin(city: City): City | undefined {
  const sig = offsetSignature(city.tz);
  return HUB_CITIES.find((h) => h.slug !== city.slug && offsetSignature(h.tz) === sig);
}

// Guards the generated pSEO surface: URL uniqueness, no duplicate-content
// pairs, and no dead internal links from the curated lists.

import { describe, it, expect } from 'vitest';
import {
  CITIES,
  HUB_CITIES,
  HUB_PAIRS,
  cityBySlug,
  hubTwin,
  offsetSignature,
  pairPath,
  pairsFor,
} from '../lib/cities';
import { GUIDES } from '../lib/guides';
import { rankSlots, staticParticipant } from '../lib/schedule';
import { gapRange, overlapHours } from '../lib/facts';

describe('city dataset', () => {
  it('has a unique, URL-safe slug for every city', () => {
    const slugs = CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives every city a country and an IANA zone', () => {
    for (const c of CITIES) {
      expect(c.country.length).toBeGreaterThan(0);
      expect(c.tz).toMatch(/^[A-Za-z_]+\/[A-Za-z_/-]+$/);
    }
  });
});

describe('hub selection', () => {
  it('picks only cities with distinct offset profiles', () => {
    const sigs = HUB_CITIES.map((c) => offsetSignature(c.tz));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('drops same-clock cities from the pair matrix', () => {
    // Toronto tracks New York exactly, so only one of them can be a hub.
    const hubSlugs = new Set(HUB_CITIES.map((c) => c.slug));
    expect(hubSlugs.has('new-york')).toBe(true);
    expect(hubSlugs.has('toronto')).toBe(false);
  });

  it('points a dropped city at its hub twin', () => {
    const berlin = cityBySlug('berlin')!;
    expect(pairsFor(berlin)).toHaveLength(0);
    expect(hubTwin(berlin)?.slug).toBe('paris');
  });
});

describe('pair routes', () => {
  it('emits every unordered hub pair exactly once', () => {
    const n = HUB_CITIES.length;
    expect(HUB_PAIRS).toHaveLength((n * (n - 1)) / 2);
  });

  it('never emits both directions of a pair', () => {
    const keys = HUB_PAIRS.map((p) => `${p.a.slug}|${p.b.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of HUB_PAIRS) {
      expect(keys).not.toContain(`${p.b.slug}|${p.a.slug}`);
    }
  });

  it('resolves a pair path in either argument order', () => {
    const a = cityBySlug('london')!;
    const b = cityBySlug('tokyo')!;
    expect(pairPath(a, b)).toBe(pairPath(b, a));
    expect(pairPath(a, b)).toMatch(/^\/meet\/[a-z-]+\/[a-z-]+\/$/);
  });

  it('returns null for a pair that has no page', () => {
    expect(pairPath(cityBySlug('berlin')!, cityBySlug('paris')!)).toBeNull();
  });

  it('keeps every home-page featured pair linkable', () => {
    // Mirrors FEATURED_PAIR_SLUGS in src/pages/index.astro — a pair that stops
    // being generated must not silently become a 404 from the home page.
    const featured: Array<[string, string]> = [
      ['san-francisco', 'london'],
      ['new-york', 'london'],
      ['london', 'mumbai'],
      ['new-york', 'mumbai'],
      ['san-francisco', 'singapore'],
      ['london', 'singapore'],
      ['new-york', 'sao-paulo'],
      ['london', 'tokyo'],
      ['san-francisco', 'sydney'],
      ['london', 'sydney'],
      ['new-york', 'tokyo'],
      ['mumbai', 'singapore'],
    ];
    for (const [x, y] of featured) {
      const a = cityBySlug(x);
      const b = cityBySlug(y);
      expect(a, `unknown city slug: ${x}`).toBeDefined();
      expect(b, `unknown city slug: ${y}`).toBeDefined();
      expect(pairPath(a!, b!), `no pair page for ${x}/${y}`).not.toBeNull();
    }
  });
});

describe('guides', () => {
  it('has unique slugs and complete metadata', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(g.title.length).toBeGreaterThan(10);
      expect(g.description.length).toBeGreaterThan(50);
      expect(g.body.length).toBeGreaterThan(3);
    }
  });

  it('ships no placeholder copy', () => {
    const text = JSON.stringify(GUIDES);
    for (const marker of ['TODO', 'PLACEHOLDER', 'FILL', 'Lorem ipsum', '<fill']) {
      expect(text).not.toContain(marker);
    }
  });
});

describe('build-time slot maths', () => {
  const london = cityBySlug('london')!;
  const tokyo = cityBySlug('tokyo')!;
  const participants = [
    staticParticipant(london, 'London', 0),
    staticParticipant(tokyo, 'Tokyo', 1),
  ];

  it('ranks five distinct slots', () => {
    const ranked = rankSlots(participants, '2026-03-10');
    expect(ranked).toHaveLength(5);
    expect(new Set(ranked.map((s) => s.iso)).size).toBe(5);
  });

  it('is deterministic for a fixed date', () => {
    const a = rankSlots(participants, '2026-03-10').map((s) => s.iso);
    const b = rankSlots(participants, '2026-03-10').map((s) => s.iso);
    expect(a).toEqual(b);
  });

  it('sorts by ascending total penalty', () => {
    const ranked = rankSlots(participants, '2026-03-10');
    const totals = ranked.map((s) => s.total);
    expect([...totals].sort((x, y) => x - y)).toEqual(totals);
  });

  it('detects the DST-driven gap shift between London and New York', () => {
    const range = gapRange(london, cityBySlug('new-york')!);
    expect(range.varies).toBe(true);
  });

  it('reports no shared 9-5 window for a half-world pair', () => {
    expect(overlapHours(london, cityBySlug('auckland')!, '2026-03-10')).toBe(0);
  });

  it('separates "no overlap" from "no zero-cost slot"', () => {
    // London and Tokyo touch at exactly 17:00 JST / 09:00 BST: zero shared time
    // by strict working-hours maths, but a slot that costs neither side
    // anything. StaticSlots.astro renders a different sentence for each, so
    // these two measures must stay distinguishable.
    const touching = [
      staticParticipant(london, 'London', 0),
      staticParticipant(tokyo, 'Tokyo', 1),
    ];
    expect(overlapHours(london, tokyo, '2026-07-31')).toBe(0);
    expect(rankSlots(touching, '2026-07-31').some((s) => s.total === 0)).toBe(true);

    // Auckland is far enough that neither measure finds anything.
    const auckland = cityBySlug('auckland')!;
    const far = [
      staticParticipant(london, 'London', 0),
      staticParticipant(auckland, 'Auckland', 1),
    ];
    expect(overlapHours(london, auckland, '2026-07-31')).toBe(0);
    expect(rankSlots(far, '2026-07-31').some((s) => s.total === 0)).toBe(false);
  });
});

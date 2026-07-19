// Pair-picking + difficulty ramp for the "Higher or Lower" population game.
// Pure logic, no React. Reuses the vendored country data (populations) via the
// CountryProps shape from the globe game.

import type { CountryFeature, CountryProps } from "../globe/countries";

export type Pair = { a: CountryProps; b: CountryProps };

// Population ratio (bigger/smaller) is the difficulty knob: a huge gap is
// obvious, a gap near 1 is brutal. 1.08 is the hard floor — anything tighter is
// an unfair near-tie, and this also quietly excludes the disputed China↔India
// pairing (ratio ~1.02 in the 2019 figures) so we never ask an unwinnable one.
const MIN_RATIO = 1.08;
const BASE_RATIO = 5.0; // streak 0 target — a clear 5× gap
const SHRINK = 0.82; // how fast the gap tightens per correct answer

/** Target bigger/smaller ratio for a given streak (higher streak → tighter). */
export function targetRatio(streak: number): number {
  return Math.max(MIN_RATIO, 1 + (BASE_RATIO - 1) * Math.pow(SHRINK, streak));
}

function band(streak: number): [number, number] {
  const t = targetRatio(streak);
  return [Math.max(MIN_RATIO, t * 0.75), t * 1.35];
}

/** Chip label + color for the difficulty of a shown pair, keyed off its ratio. */
export function difficultyForRatio(ratio: number): {
  label: string;
  color: string;
} {
  if (ratio >= 3) return { label: "EASY", color: "emerald" };
  if (ratio >= 1.8) return { label: "MEDIUM", color: "gold" };
  if (ratio >= 1.35) return { label: "HARD", color: "orange" };
  if (ratio >= 1.15) return { label: "VERY HARD", color: "rose" };
  return { label: "BRUTAL", color: "rose" };
}

function pickWeighted(pool: CountryProps[]): CountryProps {
  // pop^0.25 keeps at least one recognizable country in play (China ~8× likelier
  // than the smallest) without making it China every time.
  let total = 0;
  for (const p of pool) total += Math.pow(Math.max(p.pop, 1), 0.25);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= Math.pow(Math.max(p.pop, 1), 0.25);
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

/** First index i with pops[i] >= value (pops ascending). */
function lowerBound(pops: number[], value: number): number {
  let lo = 0,
    hi = pops.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pops[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function createPicker(all: CountryFeature[]) {
  const sorted = all
    .map((f) => f.properties)
    .filter((p) => p.playable && p.iso)
    .sort((a, b) => a.pop - b.pop);
  const pops = sorted.map((p) => p.pop);

  const recent: string[] = []; // last ~10 isos shown, to avoid quick repeats
  let lastKey = "";

  const isRecent = (iso: string | null) => iso != null && recent.includes(iso);
  const remember = (iso: string | null) => {
    if (!iso) return;
    recent.push(iso);
    while (recent.length > 10) recent.shift();
  };
  const isDisputed = (a: CountryProps, b: CountryProps) => {
    const isos = new Set([a.iso, b.iso]);
    return isos.has("CN") && isos.has("IN");
  };

  const inRange = (minPop: number, maxPop: number): CountryProps[] => {
    const start = lowerBound(pops, minPop);
    const end = lowerBound(pops, maxPop); // exclusive upper edge is fine
    return sorted.slice(start, end);
  };

  function next(streak: number): Pair {
    const [lo, hi] = band(streak);
    for (let attempt = 0; attempt < 60; attempt++) {
      const anchor = pickWeighted(sorted);
      if (isRecent(anchor.iso)) continue;
      // A valid partner is either smaller (anchor is the bigger side) or larger.
      const candidates = [
        ...inRange(anchor.pop / hi, anchor.pop / lo),
        ...inRange(anchor.pop * lo, anchor.pop * hi),
      ].filter(
        (c) =>
          c.iso !== anchor.iso && !isRecent(c.iso) && !isDisputed(anchor, c),
      );
      if (candidates.length === 0) continue;

      const partner = candidates[(Math.random() * candidates.length) | 0];
      const key = [anchor.iso, partner.iso].sort().join("|");
      if (key === lastKey) continue;

      lastKey = key;
      remember(anchor.iso);
      remember(partner.iso);
      return Math.random() < 0.5
        ? { a: anchor, b: partner }
        : { a: partner, b: anchor };
    }
    // Never hard-fail: relax toward an easier (wider) band and retry.
    return next(Math.max(0, streak - 3));
  }

  return { next };
}

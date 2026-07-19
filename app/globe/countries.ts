/**
 * Country data + round generation for the globe game.
 *
 * `/countries.geojson` is a slimmed Natural Earth 110m set. Every feature is
 * drawn on the globe, but only `playable` ones can be a target or a decoy —
 * territories and disputed areas (Greenland, W. Sahara, Antarctica) render as
 * land but have no defensible answer to "which country is this?".
 */

export type CountryProps = {
  name: string;
  iso: string | null;
  continent: string;
  pop: number;
  /** Centroid of the mainland, in degrees. */
  lat: number;
  lng: number;
  /** Angular radius of the mainland in degrees — drives the camera zoom. */
  size: number;
  playable: boolean;
};

export type CountryFeature = {
  type: "Feature";
  properties: CountryProps;
  geometry: object;
};

export type Round = {
  target: CountryFeature;
  options: CountryProps[];
  correctIndex: number;
  /** Difficulty label, set only for the record-mode ramp. */
  difficulty?: Difficulty;
};

/** Ordered easy -> brutal. `rank` drives the ramp; `label` and `color` are UI. */
export type Difficulty = {
  label: string;
  rank: number;
  /** Tailwind text/border hue for the difficulty chip. */
  color: string;
};

const DIFFICULTIES: Difficulty[] = [
  { label: "EASY", rank: 0, color: "emerald" },
  { label: "MEDIUM", rank: 1, color: "gold" },
  { label: "HARD", rank: 2, color: "orange" },
  { label: "VERY HARD", rank: 3, color: "rose" },
  { label: "99% FAIL", rank: 4, color: "rose" },
];

/** Population is a rough but honest proxy for how recognizable a country is. */
export function difficultyOf(pop: number): Difficulty {
  if (pop >= 50_000_000) return DIFFICULTIES[0];
  if (pop >= 20_000_000) return DIFFICULTIES[1];
  if (pop >= 8_000_000) return DIFFICULTIES[2];
  if (pop >= 2_000_000) return DIFFICULTIES[3];
  return DIFFICULTIES[4];
}

let cache: CountryFeature[] | null = null;

export async function loadCountries(): Promise<CountryFeature[]> {
  if (cache) return cache;
  const res = await fetch("/countries.geojson");
  if (!res.ok) throw new Error(`Failed to load countries (${res.status})`);
  const json = (await res.json()) as { features: CountryFeature[] };
  cache = json.features;
  return cache;
}

/** Regional-indicator flag, e.g. "BO" -> 🇧🇴. */
export function flagEmoji(iso: string | null): string {
  if (!iso) return "🏳️";
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/**
 * Camera altitude that frames the country. Tiny island nations need the camera
 * right down on the deck; Russia needs it backed most of the way out.
 *
 * Deliberately kept loose rather than filling the frame: the player needs to
 * see enough neighbouring coastline to place the country, and a wrong guess on
 * the same continent should usually still be on screen to light up in red.
 */
export function altitudeFor(size: number): number {
  return Math.min(3.2, Math.max(2.0, 1.5 + size * 0.05));
}

/**
 * Much farther out, for a dramatic single-question reveal: the camera pulls
 * back to show the country as a highlighted spot on the whole globe.
 */
export function revealAltitudeFor(size: number): number {
  return Math.min(3.8, Math.max(2.9, altitudeFor(size) + 1.0));
}

/** Radius of the pulsing locator ring, in degrees. */
export function ringRadiusFor(size: number): number {
  return Math.min(10, Math.max(2.5, size * 1.2));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Population^0.25. A flat random pick makes the game a parade of countries
 * nobody can place; weighting by raw population makes it China every time.
 * The fourth root leaves big countries ~8x likelier than the smallest while
 * still letting Vanuatu turn up.
 */
function weight(c: CountryProps): number {
  return Math.pow(Math.max(c.pop, 1), 0.25);
}

function pickWeighted(pool: CountryFeature[]): CountryFeature {
  const total = pool.reduce((s, f) => s + weight(f.properties), 0);
  let r = Math.random() * total;
  for (const f of pool) {
    r -= weight(f.properties);
    if (r <= 0) return f;
  }
  return pool[pool.length - 1];
}

/**
 * Four options for a target: the target plus three decoys.
 *
 * Decoys come from the target's own continent wherever possible. Drawing them
 * globally would let you win by recognizing the continent alone, without
 * knowing the country. Oceania has only 6 playable countries, so we top up from
 * other continents when a continent can't field three decoys of its own.
 */
function optionsFor(
  target: CountryFeature,
  playable: CountryFeature[],
): Pick<Round, "options" | "correctIndex"> {
  const t = target.properties;
  const sameContinent = playable.filter(
    (f) => f.properties.continent === t.continent && f.properties.name !== t.name,
  );
  const elsewhere = playable.filter(
    (f) => f.properties.continent !== t.continent,
  );
  const decoys = [...shuffle(sameContinent), ...shuffle(elsewhere)]
    .slice(0, 3)
    .map((f) => f.properties);

  const options = shuffle([t, ...decoys]);
  return { options, correctIndex: options.findIndex((o) => o.name === t.name) };
}

/** Builds `count` rounds with no repeated target, weighted toward famous ones. */
export function buildRounds(all: CountryFeature[], count: number): Round[] {
  const playable = all.filter((f) => f.properties.playable);
  const pool = [...playable];
  const rounds: Round[] = [];
  const n = Math.min(count, pool.length);

  for (let i = 0; i < n; i++) {
    const target = pickWeighted(pool);
    pool.splice(pool.indexOf(target), 1);
    rounds.push({ target, ...optionsFor(target, playable) });
  }

  return rounds;
}

/**
 * Record-mode rounds ordered easy -> brutal. Each slot targets a difficulty
 * rank that climbs across the run, sampling a random country from that bucket
 * (or the nearest non-empty one). The escalating ramp is the retention hook:
 * viewers win the opener, then stay to see where they crack.
 */
export function buildRampRounds(all: CountryFeature[], count: number): Round[] {
  const playable = all.filter((f) => f.properties.playable);
  const buckets: CountryFeature[][] = [[], [], [], [], []];
  for (const f of playable) buckets[difficultyOf(f.properties.pop).rank].push(f);
  for (const b of buckets) b.sort(() => Math.random() - 0.5);

  const cursors = [0, 0, 0, 0, 0];
  const take = (rank: number): CountryFeature | null => {
    for (let dist = 0; dist < buckets.length; dist++) {
      for (const r of [rank - dist, rank + dist]) {
        if (r >= 0 && r < buckets.length && cursors[r] < buckets[r].length) {
          return buckets[r][cursors[r]++];
        }
      }
    }
    return null;
  };

  const rounds: Round[] = [];
  for (let i = 0; i < count; i++) {
    const rank = Math.min(buckets.length - 1, Math.floor((i / count) * buckets.length));
    const target = take(rank);
    if (!target) break;
    rounds.push({
      target,
      ...optionsFor(target, playable),
      difficulty: difficultyOf(target.properties.pop),
    });
  }

  return rounds;
}

/**
 * One round whose target lives in the given continent, weighted toward famous
 * countries — used by the spin-the-wheel challenge after the wheel lands.
 * Falls back to any continent if that one has no playable countries.
 */
export function buildRoundInContinent(
  all: CountryFeature[],
  continent: string,
): Round {
  const playable = all.filter((f) => f.properties.playable);
  const inContinent = playable.filter(
    (f) => f.properties.continent === continent,
  );
  const pool = inContinent.length > 0 ? inContinent : playable;
  const target = pickWeighted(pool);
  return { target, ...optionsFor(target, playable) };
}

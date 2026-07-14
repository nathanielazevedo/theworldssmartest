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
};

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
  return Math.min(2.5, Math.max(0.85, 0.8 + size * 0.05));
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
 * Builds `count` rounds with no repeated target.
 *
 * Decoys come from the target's own continent wherever possible. Drawing them
 * globally would let you win by recognizing the continent alone, without
 * knowing the country.
 */
export function buildRounds(all: CountryFeature[], count: number): Round[] {
  const playable = all.filter((f) => f.properties.playable);
  const pool = [...playable];
  const rounds: Round[] = [];
  const n = Math.min(count, pool.length);

  for (let i = 0; i < n; i++) {
    const target = pickWeighted(pool);
    pool.splice(pool.indexOf(target), 1);

    const t = target.properties;
    const sameContinent = playable.filter(
      (f) => f.properties.continent === t.continent && f.properties.name !== t.name,
    );
    const elsewhere = playable.filter(
      (f) => f.properties.continent !== t.continent,
    );

    // Oceania has only 6 playable countries, so top up from other continents
    // when a continent can't field three decoys of its own.
    const decoys = [...shuffle(sameContinent), ...shuffle(elsewhere)]
      .slice(0, 3)
      .map((f) => f.properties);

    const options = shuffle([t, ...decoys]);
    rounds.push({
      target,
      options,
      correctIndex: options.findIndex((o) => o.name === t.name),
    });
  }

  return rounds;
}

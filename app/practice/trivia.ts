// Question typing + record-mode ramp for the trivia quiz. Mirrors the globe's
// buildRampRounds: order questions easy -> hard so viewers win the opener, then
// stay to see where they crack.

export type TriviaQuestion = {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string; // "easy" | "medium" | "hard"
};

const RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Chip label + color for a question's difficulty. */
export function difficultyMeta(difficulty: string): {
  label: string;
  color: string;
} {
  switch (difficulty) {
    case "easy":
      return { label: "EASY", color: "emerald" };
    case "medium":
      return { label: "MEDIUM", color: "gold" };
    case "hard":
      return { label: "HARD", color: "rose" };
    default:
      return { label: difficulty.toUpperCase(), color: "gold" };
  }
}

/** A cool tone for the category chip, kept distinct from the difficulty ramp. */
export const CATEGORY_COLOR = "sky";

/**
 * `count` questions ordered easy -> hard, no repeats. Each slot targets a
 * difficulty rank that climbs across the run; when a bucket is empty we borrow
 * from the nearest one.
 */
export function buildTriviaRamp(
  pool: TriviaQuestion[],
  count: number,
): TriviaQuestion[] {
  const buckets: TriviaQuestion[][] = [[], [], []];
  for (const q of pool) buckets[RANK[q.difficulty] ?? 1].push(q);
  for (const b of buckets) b.sort(() => Math.random() - 0.5);

  const cursors = [0, 0, 0];
  const take = (rank: number): TriviaQuestion | null => {
    for (let dist = 0; dist < buckets.length; dist++) {
      for (const r of [rank - dist, rank + dist]) {
        if (r >= 0 && r < buckets.length && cursors[r] < buckets[r].length) {
          return buckets[r][cursors[r]++];
        }
      }
    }
    return null;
  };

  const out: TriviaQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const rank = Math.min(
      buckets.length - 1,
      Math.floor((i / count) * buckets.length),
    );
    const q = take(rank);
    if (!q) break;
    out.push(q);
  }
  return out;
}

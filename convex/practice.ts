import { query } from "./_generated/server";
import { v } from "convex/values";

// Deterministic PRNG so a given seed always yields the same shuffle. Convex
// caches query results by args, so the client passes a fresh random `seed` each
// time it wants a new quiz (see app/practice/page.tsx).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Solo practice: return N random approved questions, WITH their correct answers
// so the player's phone can give instant feedback. This is stakes-free practice
// (no leaderboard), so exposing answers here is fine — the live game still hides
// them until the host reveals.
export const randomQuiz = query({
  args: { seed: v.number(), count: v.optional(v.number()) },
  handler: async (ctx, { seed, count }) => {
    const n = count ?? 5;
    const all = await ctx.db
      .query("questionBank")
      .withIndex("by_approved", (q) => q.eq("approved", true))
      .collect();

    // Fisher–Yates shuffle driven by the seeded PRNG.
    const rand = mulberry32(seed);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    return all.slice(0, n).map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      category: q.category,
      difficulty: q.difficulty,
    }));
  },
});

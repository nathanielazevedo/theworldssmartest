import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Top player (winner) name + score for a finished game, or null if nobody played.
async function winnerOf(
  ctx: { db: any },
  gameId: Id<"games">,
): Promise<{ name: string; score: number } | null> {
  const players = await ctx.db
    .query("players")
    .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
    .collect();
  if (players.length === 0) return null;
  const top = players.reduce((a: any, b: any) => (b.score > a.score ? b : a));
  return { name: top.name, score: top.score };
}

// Public archive: past episodes, newest first. Only games that were actually
// run (have an episode `number`) show up here.
export const archive = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").order("desc").collect();
    const out = [];
    for (const g of games) {
      if (g.number == null || g.status !== "ended") continue;
      const questions = await ctx.db
        .query("gameQuestions")
        .withIndex("by_game", (q) => q.eq("gameId", g._id))
        .collect();
      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", g._id))
        .collect();
      const winner = await winnerOf(ctx, g._id);
      out.push({
        gameId: g._id,
        number: g.number,
        title: g.title ?? `Stream #${g.number}`,
        airedAt: g.endedAt ?? g._creationTime,
        questionCount: questions.length,
        playerCount: players.length,
        winner,
      });
    }
    return out;
  },
});

// Full detail for one archived episode: every question with its correct answer
// and how the crowd voted, plus the final leaderboard (winners).
export const detail = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game || game.number == null) return null;

    const rows = await ctx.db
      .query("gameQuestions")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    rows.sort((a, b) => a.order - b.order);

    const questions = [];
    for (const row of rows) {
      const q = await ctx.db.get(row.bankQuestionId);
      if (!q) continue;

      // Crowd vote breakdown for this question in this episode.
      const answers = await ctx.db
        .query("answers")
        .withIndex("by_question", (idx) =>
          idx.eq("gameId", gameId).eq("questionId", q._id),
        )
        .collect();
      const counts: Record<number, number> = {};
      for (const a of answers) counts[a.choiceIndex] = (counts[a.choiceIndex] ?? 0) + 1;

      questions.push({
        order: row.order,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        category: q.category,
        difficulty: q.difficulty,
        crowd: { total: answers.length, counts },
      });
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const leaderboard = players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }));

    return {
      number: game.number,
      title: game.title ?? `Stream #${game.number}`,
      airedAt: game.endedAt ?? game._creationTime,
      questions,
      leaderboard,
    };
  },
});

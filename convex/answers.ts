import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Kahoot-style speed scoring: a correct answer is worth between MIN and MAX
// points, scaled linearly by how quickly it came in within the time limit.
const MAX_POINTS = 1000;
const MIN_POINTS = 500;

function scoreAnswer(elapsedMs: number, timeLimitMs: number): number {
  const frac = Math.min(1, Math.max(0, elapsedMs / timeLimitMs));
  return Math.round(MAX_POINTS - (MAX_POINTS - MIN_POINTS) * frac);
}

// Submit an answer to the currently live question. Server-authoritative:
// validates the question is live, rejects late and duplicate answers, and
// computes correctness + points so the client can't tamper with scoring.
export const submit = mutation({
  args: {
    playerId: v.id("players"),
    questionId: v.id("questionBank"),
    choiceIndex: v.number(),
  },
  handler: async (ctx, { playerId, questionId, choiceIndex }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Player not found");

    const game = await ctx.db.get(player.gameId);
    if (!game) throw new ConvexError("Game not found");

    // Must be answering the live question, while it's accepting answers.
    if (game.status !== "question" || game.currentQuestionId !== questionId) {
      throw new ConvexError("This question is no longer accepting answers");
    }

    // One answer per player per question.
    const prior = await ctx.db
      .query("answers")
      .withIndex("by_player_question", (q) =>
        q.eq("playerId", playerId).eq("questionId", questionId),
      )
      .first();
    if (prior) throw new ConvexError("You already answered this question");

    const question = await ctx.db.get(questionId);
    if (!question) throw new ConvexError("Question not found");

    const now = Date.now();
    const startedAt = game.questionStartedAt ?? now;
    const elapsed = now - startedAt;
    const timeLimitMs = question.timeLimitSec * 1000;

    // Reject answers that arrive after the timer would have expired.
    if (elapsed > timeLimitMs) {
      throw new ConvexError("Time's up!");
    }

    const isCorrect = choiceIndex === question.correctIndex;
    const pointsAwarded = isCorrect ? scoreAnswer(elapsed, timeLimitMs) : 0;

    await ctx.db.insert("answers", {
      gameId: game._id,
      questionId,
      playerId,
      choiceIndex,
      answeredAt: now,
      isCorrect,
      pointsAwarded,
    });

    if (pointsAwarded > 0) {
      await ctx.db.patch(playerId, { score: player.score + pointsAwarded });
    }

    return { accepted: true };
  },
});

// Live per-option answer tally for the current question, plus this player's
// own submitted choice (if any). Powers the broadcast bars and player lock-in.
export const liveCounts = query({
  args: {
    gameId: v.id("games"),
    questionId: v.id("questionBank"),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, { gameId, questionId, playerId }) => {
    const rows = await ctx.db
      .query("answers")
      .withIndex("by_question", (q) =>
        q.eq("gameId", gameId).eq("questionId", questionId),
      )
      .collect();

    const counts: Record<number, number> = {};
    for (const r of rows) {
      counts[r.choiceIndex] = (counts[r.choiceIndex] ?? 0) + 1;
    }

    let myChoice: number | null = null;
    if (playerId) {
      const mine = rows.find((r) => r.playerId === playerId);
      if (mine) myChoice = mine.choiceIndex;
    }

    return { total: rows.length, counts, myChoice };
  },
});

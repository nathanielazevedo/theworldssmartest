import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ---- helpers ----------------------------------------------------------------

// A player-safe view of the current question: options are always visible, but
// the correct answer is withheld until the host reveals it (prevents cheating
// by inspecting network traffic while a question is live).
function safeQuestion(q: Doc<"questionBank"> | null, status: string) {
  if (!q) return null;
  const revealed = status === "reveal" || status === "leaderboard";
  return {
    _id: q._id,
    text: q.text,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimitSec: q.timeLimitSec,
    correctIndex: revealed ? q.correctIndex : null,
  };
}

// ---- mutations --------------------------------------------------------------

// Create a new game from a set of approved bank questions. This becomes THE
// current game (only one is ever live at a time). Any previous game is marked
// ended so stale player sessions know to rejoin.
export const create = mutation({
  args: {
    hostId: v.string(),
    questionIds: v.array(v.id("questionBank")),
  },
  handler: async (ctx, { hostId, questionIds }) => {
    const previous = await ctx.db.query("games").order("desc").first();
    if (previous && previous.status !== "ended") {
      await ctx.db.patch(previous._id, { status: "ended", endedAt: Date.now() });
    }

    // Next episode number = highest existing number + 1.
    const withNumbers = await ctx.db.query("games").order("desc").collect();
    const maxNumber = withNumbers.reduce((m, g) => Math.max(m, g.number ?? 0), 0);
    const number = maxNumber + 1;

    const gameId = await ctx.db.insert("games", {
      status: "lobby",
      hostId,
      currentIndex: -1,
      number,
      title: `Stream #${number}`,
    });

    let order = 0;
    for (const bankQuestionId of questionIds) {
      await ctx.db.insert("gameQuestions", { gameId, bankQuestionId, order });
      order++;
    }

    return { gameId };
  },
});

// Advance to the next question (or end the game if none remain).
export const advance = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const nextIndex = game.currentIndex + 1;
    const next = await ctx.db
      .query("gameQuestions")
      .withIndex("by_game", (q) => q.eq("gameId", gameId).eq("order", nextIndex))
      .first();

    if (!next) {
      await ctx.db.patch(gameId, { status: "ended", endedAt: Date.now() });
      return { status: "ended" as const };
    }

    await ctx.db.patch(gameId, {
      status: "question",
      currentIndex: nextIndex,
      currentQuestionId: next.bankQuestionId,
      questionStartedAt: Date.now(),
    });
    return { status: "question" as const };
  },
});

export const reveal = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    await ctx.db.patch(gameId, { status: "reveal" });
  },
});

export const showLeaderboard = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    await ctx.db.patch(gameId, { status: "leaderboard" });
  },
});

// ---- queries ----------------------------------------------------------------

// Reactive: the host, players, and broadcast all subscribe to this. Returns
// the single current game (the most recently created), or null if none exists.
export const current = query({
  args: {},
  handler: async (ctx) => {
    const game = await ctx.db.query("games").order("desc").first();
    if (!game) return null;

    const total = (
      await ctx.db
        .query("gameQuestions")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect()
    ).length;

    let question = null;
    if (game.currentQuestionId) {
      const q = await ctx.db.get(game.currentQuestionId);
      question = safeQuestion(q, game.status);
    }

    return {
      _id: game._id,
      status: game.status,
      currentIndex: game.currentIndex,
      totalQuestions: total,
      questionStartedAt: game.questionStartedAt ?? null,
      number: game.number ?? null,
      title: game.title ?? null,
      question,
    };
  },
});

// The full ordered question list for a game (host-only view; includes answers).
export const gameQuestionList = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const rows = await ctx.db
      .query("gameQuestions")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const out = [];
    for (const row of rows) {
      const q = await ctx.db.get(row.bankQuestionId);
      if (q) out.push({ order: row.order, question: q });
    }
    return out.sort((a, b) => a.order - b.order);
  },
});

import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Join the current game with a nickname. Guests only in Phase 1 (userId is
// wired up in Phase 3). Returns the playerId the client stores locally.
export const join = mutation({
  args: {
    name: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { name, userId }) => {
    const game = await ctx.db.query("games").order("desc").first();
    if (!game) throw new ConvexError("No game is running yet");
    if (game.status === "ended") throw new ConvexError("The game has ended");

    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) throw new ConvexError("Please enter a name");

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      name: trimmed,
      userId,
      score: 0,
      joinedAt: Date.now(),
    });

    return { playerId, gameId: game._id };
  },
});

// Standings for a game, highest score first.
export const leaderboard = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    return players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        _id: p._id,
        name: p.name,
        score: p.score,
        rank: i + 1,
      }));
  },
});

// A single player's current standing (for their phone's between-round screen).
export const me = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const all = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", player.gameId))
      .collect();
    const sorted = all.sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex((p) => p._id === playerId) + 1;

    return {
      _id: player._id,
      name: player.name,
      score: player.score,
      rank,
      totalPlayers: all.length,
    };
  },
});

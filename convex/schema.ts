import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Game lifecycle:
//   lobby      -> players are joining, no active question
//   question   -> a question is live and accepting answers
//   reveal     -> answers closed, correct answer shown
//   leaderboard-> standings shown between questions
//   ended      -> game over
export const gameStatus = v.union(
  v.literal("lobby"),
  v.literal("question"),
  v.literal("reveal"),
  v.literal("leaderboard"),
  v.literal("ended"),
);

export default defineSchema({
  // Each game is one "stream" / episode. Only one is live at a time; "the
  // current game" is the most recently created row (see games.current). Ended
  // games with a `number` set make up the public archive (see streams.ts).
  games: defineTable({
    status: gameStatus,
    hostId: v.string(), // opaque host session id (no auth yet in Phase 1)
    currentIndex: v.number(), // index into gameQuestions order; -1 in lobby
    currentQuestionId: v.optional(v.id("questionBank")),
    questionStartedAt: v.optional(v.number()), // ms epoch, for speed scoring
    // Episode metadata (optional so pre-existing game rows still validate).
    number: v.optional(v.number()), // sequential episode number, e.g. 1, 2, 3
    title: v.optional(v.string()), // e.g. "Stream #1"
    endedAt: v.optional(v.number()), // ms epoch when the episode finished
  }),

  questionBank: defineTable({
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    category: v.string(),
    difficulty: v.string(), // "easy" | "medium" | "hard"
    timeLimitSec: v.number(),
    source: v.union(v.literal("authored"), v.literal("ai")),
    approved: v.boolean(),
  }).index("by_approved", ["approved"]),

  // Questions attached to a specific game, in play order.
  gameQuestions: defineTable({
    gameId: v.id("games"),
    bankQuestionId: v.id("questionBank"),
    order: v.number(),
  }).index("by_game", ["gameId", "order"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    userId: v.optional(v.string()), // set when logged in (Phase 3); null = guest
    score: v.number(),
    joinedAt: v.number(),
  }).index("by_game", ["gameId"]),

  answers: defineTable({
    gameId: v.id("games"),
    questionId: v.id("questionBank"),
    playerId: v.id("players"),
    choiceIndex: v.number(),
    answeredAt: v.number(),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
  })
    // For live per-option counts on the current question.
    .index("by_question", ["gameId", "questionId"])
    // For enforcing one-answer-per-player-per-question.
    .index("by_player_question", ["playerId", "questionId"]),
});

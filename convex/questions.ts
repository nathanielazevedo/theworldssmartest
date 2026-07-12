import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Approved questions available to build a game from.
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("questionBank")
      .withIndex("by_approved", (q) => q.eq("approved", true))
      .collect();
  },
});

// Manually author a question straight into the approved bank.
export const create = mutation({
  args: {
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    category: v.string(),
    difficulty: v.string(),
    timeLimitSec: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.options.length < 2) throw new Error("Need at least 2 options");
    if (args.correctIndex < 0 || args.correctIndex >= args.options.length) {
      throw new Error("correctIndex out of range");
    }
    return await ctx.db.insert("questionBank", {
      ...args,
      source: "authored",
      approved: true,
    });
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// All questions (approved + unapproved) — for the management UI.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("questionBank").order("desc").collect();
  },
});

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

export const update = mutation({
  args: {
    id: v.id("questionBank"),
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    category: v.string(),
    difficulty: v.string(),
    timeLimitSec: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    if (fields.options.length < 2) throw new Error("Need at least 2 options");
    if (fields.correctIndex < 0 || fields.correctIndex >= fields.options.length) {
      throw new Error("correctIndex out of range");
    }
    await ctx.db.patch(id, fields);
  },
});

export const setApproved = mutation({
  args: { id: v.id("questionBank"), approved: v.boolean() },
  handler: async (ctx, { id, approved }) => {
    await ctx.db.patch(id, { approved });
  },
});

export const remove = mutation({
  args: { id: v.id("questionBank") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const bulkCreate = mutation({
  args: {
    questions: v.array(
      v.object({
        text: v.string(),
        options: v.array(v.string()),
        correctIndex: v.number(),
        category: v.string(),
        difficulty: v.string(),
        timeLimitSec: v.number(),
        approved: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { questions }) => {
    let inserted = 0;
    for (const q of questions) {
      if (q.options.length < 2) continue;
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) continue;
      await ctx.db.insert("questionBank", {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        category: q.category,
        difficulty: q.difficulty,
        timeLimitSec: q.timeLimitSec,
        source: "authored",
        approved: q.approved ?? true,
      });
      inserted++;
    }
    return inserted;
  },
});

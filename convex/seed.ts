import { mutation } from "./_generated/server";

// Curated for a live audience: surprising, debate-sparking, "wait, WHAT?"
// questions with high share potential. All answers fact-checked.
const SAMPLE = [
  {
    text: "Cleopatra lived closer in time to which event?",
    options: [
      "The building of the Great Pyramid of Giza",
      "The Moon landing",
      "The fall of Rome",
      "The birth of Julius Caesar",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which of these appeared on Earth FIRST?",
    options: ["Trees", "Sharks", "Dinosaurs", "Flowers"],
    correctIndex: 1,
    category: "Science",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Archaeologists have found 3,000-year-old EDIBLE jars of what in Egyptian tombs?",
    options: ["Honey", "Wine", "Bread", "Cheese"],
    correctIndex: 0,
    category: "Science",
    difficulty: "easy",
    timeLimitSec: 15,
  },
  {
    text: "How many hearts does an octopus have?",
    options: ["1", "2", "3", "8"],
    correctIndex: 2,
    category: "Animals",
    difficulty: "easy",
    timeLimitSec: 15,
  },
  {
    text: "Which of these is botanically a berry?",
    options: ["Strawberry", "Raspberry", "Banana", "Cherry"],
    correctIndex: 2,
    category: "Food",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "On Venus, a single DAY is longer than its…",
    options: ["Year", "Week", "Month", "Decade"],
    correctIndex: 0,
    category: "Space",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "There are more possible games of chess than there are ___ in the observable universe.",
    options: ["Atoms", "Stars", "Galaxies", "Grains of sand on Earth"],
    correctIndex: 0,
    category: "Science",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Wombats are famous for producing poop shaped like a…",
    options: ["Cube", "Sphere", "Star", "Spiral"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which planet would FLOAT if you dropped it in a giant tub of water?",
    options: ["Saturn", "Jupiter", "Neptune", "Mars"],
    correctIndex: 0,
    category: "Space",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Humans share roughly 50% of their DNA with which of these?",
    options: ["Bananas", "Mushrooms", "Jellyfish", "Grass"],
    correctIndex: 0,
    category: "Science",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "The shortest war in recorded history lasted about how long?",
    options: ["40 minutes", "3 days", "2 weeks", "6 hours"],
    correctIndex: 0,
    category: "History",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "What is Scotland's official national animal?",
    options: ["Unicorn", "Lion", "Stag", "Golden eagle"],
    correctIndex: 0,
    category: "Geography",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "A group of flamingos is called a…",
    options: ["Flamboyance", "Flock", "Parade", "Blush"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "The man who designed the Pringles can was, at his request, partly buried…",
    options: ["In a Pringles can", "At sea", "Standing upright", "Under a potato field"],
    correctIndex: 0,
    category: "Pop Culture",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "How many bones does a shark have?",
    options: ["Zero", "12", "Over 100", "Over 200"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "easy",
    timeLimitSec: 15,
  },
  {
    text: "What color is a polar bear's skin, underneath its fur?",
    options: ["Black", "White", "Pink", "Grey"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "What is the name for the dot on top of a lowercase 'i' or 'j'?",
    options: ["Tittle", "Serif", "Glyph", "Umlaut"],
    correctIndex: 0,
    category: "Language",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Which of these large countries has NO natural permanent rivers?",
    options: ["Saudi Arabia", "Egypt", "Australia", "Argentina"],
    correctIndex: 0,
    category: "Geography",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Which is the hottest planet in our solar system?",
    options: ["Venus", "Mercury", "Mars", "Jupiter"],
    correctIndex: 0,
    category: "Space",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which letter does NOT appear in the name of any U.S. state?",
    options: ["Q", "Z", "X", "J"],
    correctIndex: 0,
    category: "Language",
    difficulty: "hard",
    timeLimitSec: 25,
  },
];

async function insertAll(ctx: any) {
  let inserted = 0;
  for (const q of SAMPLE) {
    await ctx.db.insert("questionBank", {
      ...q,
      source: "authored",
      approved: true,
    });
    inserted++;
  }
  return inserted;
}

// Insert the sample set only if the bank is empty (safe to click repeatedly).
export const sample = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("questionBank").take(1);
    if (existing.length > 0) {
      return { inserted: 0, note: "Question bank already has questions" };
    }
    return { inserted: await insertAll(ctx) };
  },
});

// Wipe the bank and reload the curated set. Use when you've changed SAMPLE.
export const reseed = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("questionBank").collect();
    for (const q of all) await ctx.db.delete(q._id);
    return { deleted: all.length, inserted: await insertAll(ctx) };
  },
});

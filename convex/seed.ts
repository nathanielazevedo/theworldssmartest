import { mutation } from "./_generated/server";

// Curated for a live audience: the weirdest, most "wait, WHAT?!" facts we could
// verify — the kind people screenshot and argue about. Correct answers are
// spread evenly across positions so there's no "it's always B" tell.
const SAMPLE = [
  {
    text: "Cleopatra lived closer in time to which of these?",
    options: [
      "The Great Pyramid being built",
      "The first Moon landing",
      "The fall of Rome",
      "The birth of Julius Caesar",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "T. rex lived closer in time to humans than to which dinosaur?",
    options: ["Triceratops", "Velociraptor", "Stegosaurus", "Edmontosaurus"],
    correctIndex: 2,
    category: "Science",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Which of these appeared on Earth FIRST?",
    options: ["Trees", "Dinosaurs", "Flowers", "Sharks"],
    correctIndex: 3,
    category: "Science",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Wombats are the only animal known to poop in the shape of a…",
    options: ["Cube", "Sphere", "Star", "Spiral"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "What color is an octopus's blood?",
    options: ["Red", "Blue", "Green", "Clear"],
    correctIndex: 1,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which everyday food is naturally, mildly radioactive?",
    options: ["Apples", "Bread", "Bananas", "Rice"],
    correctIndex: 2,
    category: "Science",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "On Venus, a single DAY lasts longer than its entire…",
    options: ["Week", "Month", "Decade", "Year"],
    correctIndex: 3,
    category: "Space",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which planet is so light it would FLOAT in a giant tub of water?",
    options: ["Saturn", "Jupiter", "Mars", "Neptune"],
    correctIndex: 0,
    category: "Space",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "There are more ___ on Earth than there are stars in the Milky Way.",
    options: ["People", "Trees", "Cars", "Cities"],
    correctIndex: 1,
    category: "Science",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Who has MORE bones in their body?",
    options: ["A grown adult", "A teenager", "A newborn baby", "They're equal"],
    correctIndex: 2,
    category: "Science",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Sea otters hold hands while they sleep to keep from…",
    options: ["Getting cold", "Sinking", "Fighting", "Drifting apart"],
    correctIndex: 3,
    category: "Animals",
    difficulty: "easy",
    timeLimitSec: 15,
  },
  {
    text: "Where is a shrimp's heart located?",
    options: ["In its head", "In its tail", "In its legs", "It has none"],
    correctIndex: 0,
    category: "Animals",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Which animal can hold its breath LONGER underwater?",
    options: ["A dolphin", "A sloth", "A duck", "A beaver"],
    correctIndex: 1,
    category: "Animals",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "A blue whale's heart is roughly the size of a…",
    options: ["Basketball", "Microwave", "Small car", "House cat"],
    correctIndex: 2,
    category: "Animals",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Astronauts can grow up to 2 inches taller in space because…",
    options: [
      "They eat more up there",
      "Their muscles swell",
      "Their bones regrow",
      "Their spine stretches out",
    ],
    correctIndex: 3,
    category: "Science",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "Founded in 1889, Nintendo originally made and sold…",
    options: ["Playing cards", "Toys", "Rice", "Vacuum cleaners"],
    correctIndex: 0,
    category: "Pop Culture",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "The man who designed the Pringles can was, at his request, buried…",
    options: [
      "At sea",
      "In a Pringles can",
      "Standing upright",
      "Under a potato farm",
    ],
    correctIndex: 1,
    category: "Pop Culture",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "There are more possible games of chess than there are ___ in the observable universe.",
    options: ["Stars", "Galaxies", "Atoms", "Grains of sand"],
    correctIndex: 2,
    category: "Science",
    difficulty: "hard",
    timeLimitSec: 25,
  },
  {
    text: "What is Scotland's official national animal?",
    options: ["The lion", "The stag", "The eagle", "The unicorn"],
    correctIndex: 3,
    category: "Geography",
    difficulty: "medium",
    timeLimitSec: 20,
  },
  {
    text: "Which letter appears in NO U.S. state name at all?",
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

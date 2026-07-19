"use client";

// Shared building blocks for the Shorts "record mode" used by both the globe
// game and the trivia quiz, so the two read as one product: the big countdown
// clock, the difficulty/category chip, the running results meter, the rotating
// hook picker, and the score persona line.

import { motion } from "framer-motion";

// Solid dark fill (not a color tint) so a chip stays legible over anything.
export const CHIP_COLORS: Record<string, string> = {
  emerald: "text-emerald-300 border-emerald-400/70 bg-black/80",
  gold: "text-gold border-gold/70 bg-black/80",
  orange: "text-orange-300 border-orange-400/70 bg-black/80",
  rose: "text-rose-300 border-rose-400/70 bg-black/80",
  sky: "text-sky-300 border-sky-400/70 bg-black/80",
  violet: "text-violet-300 border-violet-400/70 bg-black/80",
};

/** A small labelled pill — difficulty ("HARD"), category ("SCIENCE"), etc. */
export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <motion.span
      key={label}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 16 }}
      className={`rounded-full border px-4 py-1 text-xs font-black uppercase tracking-[0.15em] ${
        CHIP_COLORS[color] ?? CHIP_COLORS.gold
      }`}
    >
      {label}
    </motion.span>
  );
}

/** A big, dramatic countdown — the thing the viewer races against. */
export function Clock({
  timeLeft,
  total,
  big = false,
}: {
  timeLeft: number;
  total: number;
  /** Oversized, for the single-question spin challenge. */
  big?: boolean;
}) {
  const frac = Math.max(0, Math.min(1, timeLeft / total));
  const secs = Math.max(0, Math.ceil(timeLeft));
  const urgent = timeLeft <= 1.5;
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        key={secs}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 16 }}
        className={`font-black tabular-nums drop-shadow-lg ${
          big ? "text-8xl" : "text-6xl"
        } ${urgent ? "text-rose-400" : "text-gold"}`}
      >
        {secs}
      </motion.div>
      <div
        className={`overflow-hidden rounded-full bg-white/10 ${
          big ? "h-2.5 w-64" : "h-2 w-48"
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            urgent ? "bg-rose-500" : "bg-gold"
          }`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Running results, filled in as you answer (you-answer mode only). */
export function Meter({
  history,
  total,
}: {
  history: boolean[];
  total: number;
}) {
  return (
    <span className="flex gap-1 text-sm">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i >= history.length ? "opacity-30" : ""}>
          {i >= history.length ? "•" : history[i] ? "✅" : "❌"}
        </span>
      ))}
    </span>
  );
}

export type HookPools = {
  /** Round 1 — the scroll-stopping opener. */
  openers: string[];
  /** Middle rounds. */
  challenges: string[];
  /** Final round. */
  finishers: string[];
};

/**
 * One hook per round: a random opener first, a random finisher last, and the
 * shuffled challenges in between. Shuffled per run so no two recordings open
 * the same way.
 */
export function pickHooks(pools: HookPools, n: number): string[] {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  const middle = [...pools.challenges].sort(() => Math.random() - 0.5);
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return pick(pools.openers);
    if (i === n - 1) return pick(pools.finishers);
    return middle[(i - 1) % middle.length];
  });
}

export function scoreLine(score: number, total: number): string {
  const p = total === 0 ? 0 : score / total;
  if (p === 1) return "Flawless. Certified genius 🧠";
  if (p >= 0.6) return "Not bad at all 😎";
  if (p > 0) return "Room to improve 🫏";
  return "Ouch. Full donkey 🫏";
}

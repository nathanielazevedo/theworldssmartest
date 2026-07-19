"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Burst, DonkeyRain } from "@/app/components/reactions";
import { Chip, Clock } from "@/app/components/record";
import {
  buildLanguageRounds,
  difficultyMeta,
  type LangRound,
} from "./languages";

const ROUND_OPTIONS = [5, 10, 15];
const TIMER_SECONDS = 7; // a beat longer than the map — you have to read it

const CORRECT_LINES = [
  "Polyglot detected 🧠",
  "You've clearly traveled.",
  "The donkey can't even read.",
  "Linguist behavior.",
  "Suspiciously worldly.",
  "Correct. Impressive.",
];
const WRONG_LINES = [
  "HEE-HAW. 🫏",
  "Not even close.",
  "A donkey guessed better.",
  "That's a different alphabet, friend.",
  "Confidently, catastrophically wrong.",
];
const TIMEOUT_LINES = [
  "Too slow! 🫏",
  "The donkey answered first.",
  "Tick, tock, hee-haw.",
];
const STREAK_LINES: Record<number, string> = {
  2: "🔥 Two in a row",
  3: "🔥🔥 On fire",
  4: "🔥🔥🔥 Globetrotter",
  5: "🧠 GALAXY BRAIN",
};

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

function persona(score: number, total: number) {
  const p = total === 0 ? 0 : score / total;
  if (p === 1)
    return { title: "UNITED NATIONS 🧠", blurb: "You speak the world. Zero donkey." };
  if (p >= 0.8) return { title: "Seasoned Traveler 🧭", blurb: "Only a faint accent of donkey." };
  if (p >= 0.6) return { title: "Weekend Tourist 🗺️", blurb: "You'd order coffee just fine." };
  if (p >= 0.4) return { title: "Half Donkey 🫏", blurb: "It all looks like squiggles to you." };
  if (p > 0) return { title: "Certified Donkey 🫏", blurb: "Hee-haw, friend. Hee-haw." };
  return { title: "MAXIMUM DONKEY 🫏🫏🫏", blurb: "A flawless run of wrong. Majestic." };
}

export default function LanguagePage() {
  const [rounds, setRounds] = useState<LangRound[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"question" | "revealed">("question");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [choice, setChoice] = useState<number | null>(null);
  const [reaction, setReaction] = useState("");
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);

  const start = useCallback((count: number) => {
    setRounds(buildLanguageRounds(count));
    setIndex(0);
    setPhase("question");
    setChoice(null);
    setReaction("");
    setStreak(0);
    setHistory([]);
  }, []);

  const round = rounds && index < rounds.length ? rounds[index] : null;

  // Countdown; running out is a miss.
  useEffect(() => {
    if (!round || phase !== "question") return;
    setTimeLeft(TIMER_SECONDS);
    const deadline = Date.now() + TIMER_SECONDS * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        setChoice(null);
        setReaction(pick(TIMEOUT_LINES));
        setStreak(0);
        setHistory((h) => [...h, false]);
        setPhase("revealed");
      }
    }, 50);
    return () => clearInterval(id);
  }, [round, phase]);

  const answer = (i: number) => {
    if (!round || phase !== "question") return;
    const correct = i === round.correctIndex;
    setChoice(i);
    setReaction(pick(correct ? CORRECT_LINES : WRONG_LINES));
    setStreak((s) => (correct ? s + 1 : 0));
    setHistory((h) => [...h, correct]);
    setPhase("revealed");
  };

  const next = () => {
    setChoice(null);
    setReaction("");
    setIndex((i) => i + 1);
    setPhase("question");
  };

  if (!rounds) return <Setup onStart={start} />;

  if (index >= rounds.length) {
    return (
      <Results
        score={history.filter(Boolean).length}
        history={history}
        onAgain={() => start(rounds.length)}
        onChangeLength={() => setRounds(null)}
      />
    );
  }

  if (!round) return null;

  const answered = phase === "revealed";
  const timedOut = answered && choice === null;
  const gotItRight = answered && choice === round.correctIndex;
  const diff = difficultyMeta(round.language.difficulty);

  return (
    <main className="bg-hero relative flex min-h-screen flex-col items-center p-5">
      <div className="flex w-full max-w-md items-center justify-between text-sm text-muted">
        <Link href="/" className="hover:text-cream">
          ← Exit
        </Link>
        <span>
          Round {index + 1} of {rounds.length}
        </span>
        <Meter history={history} total={rounds.length} />
      </div>

      <div className="flex w-full max-w-md flex-1 flex-col justify-center gap-5 pb-28">
        <div className="flex justify-center">
          <Chip label={diff.label} color={diff.color} />
        </div>

        <div className="text-center text-xs uppercase tracking-[0.2em] text-muted">
          What language is this?
        </div>

        {/* The sample — dir=auto so Arabic/Hebrew render right-to-left. */}
        <div className="rounded-3xl border border-line bg-surface/60 px-6 py-8 text-center backdrop-blur">
          <p
            dir="auto"
            className="text-2xl font-black leading-snug text-cream sm:text-3xl"
          >
            {round.sample}
          </p>
        </div>

        {!answered ? (
          <div className="flex justify-center">
            <Clock timeLeft={timeLeft} total={TIMER_SECONDS} />
          </div>
        ) : (
          <div className="h-[72px]" />
        )}

        <div className="relative grid grid-cols-2 gap-3">
          {answered && (gotItRight ? <Burst /> : <DonkeyRain />)}
          {round.options.map((opt, i) => {
            const isCorrect = i === round.correctIndex;
            const isMine = i === choice;
            let cls =
              "bg-black/70 text-white border border-white/15 hover:border-white/40";
            if (answered) {
              if (isCorrect)
                cls = "bg-emerald-600 text-white ring-4 ring-emerald-300 border border-transparent";
              else if (isMine)
                cls = "bg-rose-600 text-white ring-4 ring-rose-300 border border-transparent";
              else cls = "bg-surface text-muted opacity-60 border border-transparent";
            }
            return (
              <motion.button
                key={opt.name}
                onClick={() => answer(i)}
                disabled={answered}
                whileTap={answered ? undefined : { scale: 0.96 }}
                animate={
                  answered && isCorrect
                    ? { scale: [1, 1.05, 1] }
                    : answered && isMine
                      ? { x: [0, -6, 6, -4, 4, 0] }
                      : {}
                }
                transition={{ duration: 0.4 }}
                className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-base font-bold leading-tight transition-colors ${cls}`}
              >
                {answered && (isCorrect || isMine) && <span>{opt.flag}</span>}
                <span>{opt.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center gap-4 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur"
          >
            <div className="min-w-0 flex-1">
              <div
                className={`text-lg font-black ${
                  gotItRight ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {gotItRight ? "Correct!" : timedOut ? "Time's up! 🫏" : "Donkey Brains! 🫏"}
              </div>
              {gotItRight && STREAK_LINES[Math.min(streak, 5)] && (
                <div className="text-sm font-black text-gold">
                  {STREAK_LINES[Math.min(streak, 5)]}
                </div>
              )}
              {!gotItRight && (
                <div className="truncate text-xs text-muted">
                  It was {round.language.flag} {round.language.name}. {reaction}
                </div>
              )}
            </div>
            <button
              onClick={next}
              className="shrink-0 rounded-full bg-gold px-5 py-3 text-base font-black text-ink transition hover:bg-gold-bright"
            >
              {index + 1 < rounds.length ? "Next →" : "Results →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Setup({ onStart }: { onStart: (count: number) => void }) {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="wordmark text-5xl text-cream sm:text-6xl">
          What
          <br />
          <span className="text-gold">Language?</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm text-muted">
          Read the snippet. Name the language before the clock runs out — or prove
          you have donkey brains. 🫏
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          How many rounds?
        </span>
        <div className="flex gap-3">
          {ROUND_OPTIONS.map((n) => (
            <motion.button
              key={n}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStart(n)}
              className="h-16 w-16 rounded-full bg-gold text-2xl font-black text-ink shadow-[0_0_40px_-8px] shadow-gold/60 transition hover:bg-gold-bright"
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      <Link href="/" className="text-sm text-muted hover:text-cream">
        ← Home
      </Link>
    </main>
  );
}

function Results({
  score,
  history,
  onAgain,
  onChangeLength,
}: {
  score: number;
  history: boolean[];
  onAgain: () => void;
  onChangeLength: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const total = history.length;
  const p = persona(score, total);
  const grid = history.map((c) => (c ? "🧠" : "🫏")).join(" ");
  const smart = total > 0 && score / total >= 0.6;

  const share = async () => {
    const text = `What Language? ${score}/${total}\n${grid}\n${p.title}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — no-op.
    }
  };

  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="relative">
        {smart ? <Burst big /> : <DonkeyRain big />}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
        >
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">
            Final ruling
          </div>
          <div className="mb-1 text-3xl">{grid}</div>
          <div className="my-1 text-6xl font-black text-gold">
            {score}/{total}
          </div>
          <div className="text-2xl font-black text-cream">{p.title}</div>
          <div className="mx-auto mb-7 mt-1 max-w-xs text-muted">{p.blurb}</div>

          <div className="mx-auto w-full max-w-xs space-y-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onAgain}
              className="w-full rounded-full bg-gold px-6 py-4 text-lg font-black text-ink transition hover:bg-gold-bright"
            >
              {smart ? "Defend your title 🔁" : "Try again 🔁"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={share}
              className="w-full rounded-full bg-surface px-6 py-4 text-lg font-bold text-cream transition hover:bg-surface-2"
            >
              {copied ? "Copied! Go humiliate a friend 📋" : "Share your score 🗣️"}
            </motion.button>
            <button
              onClick={onChangeLength}
              className="block w-full pt-1 text-sm text-muted hover:text-cream"
            >
              Change round count
            </button>
            <Link href="/" className="block text-sm text-muted hover:text-cream">
              Home
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

/** Brains vs. donkeys, filled in as you go. */
function Meter({ history, total }: { history: boolean[]; total: number }) {
  return (
    <span className="flex gap-1 text-sm" title="Your fluency, so far">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i >= history.length ? "opacity-25" : ""}>
          {i >= history.length ? "•" : history[i] ? "🧠" : "🫏"}
        </span>
      ))}
    </span>
  );
}

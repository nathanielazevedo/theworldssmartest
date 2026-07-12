"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { answerStyle } from "@/app/lib/answerStyles";

type Q = {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string;
};

// --- Funny copy -------------------------------------------------------------
const CORRECT_LINES = [
  "Big brain. 🧠",
  "Certified genius.",
  "Too easy for you 😎",
  "Einstein is shaking.",
  "Show-off. 💅",
  "Nailed it. 🎯",
  "You just KNEW that.",
  "Absolute unit of a brain.",
];
const WRONG_LINES = [
  "Oof. 💀",
  "Not even close 😬",
  "The audience gasps.",
  "Bold strategy. Didn't pay off.",
  "Google would've helped.",
  "We won't tell anyone. 🤫",
  "Confidently incorrect.",
  "Yikes. 📉",
];
const STREAK_LINES: Record<number, string> = {
  2: "🔥 Two in a row",
  3: "🔥🔥 On fire!",
  4: "🔥🔥🔥 Unstoppable",
  5: "🌋 GENIUS MODE",
};
function pickLine(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function persona(score: number, total: number) {
  const pct = score / total;
  if (pct === 1)
    return { title: "Certified Genius 🧠👑", blurb: "The World's Smartest… probably. Screenshot this." };
  if (pct >= 0.8)
    return { title: "Big Brain Energy 🧠", blurb: "So close to perfect it hurts." };
  if (pct >= 0.6)
    return { title: "Respectably Mid 🙂", blurb: "You know things. Some things." };
  if (pct >= 0.4)
    return { title: "You Tried 😅", blurb: "Participation trophy incoming." };
  if (pct > 0)
    return { title: "Rough Outing 🫠", blurb: "At least you showed up." };
  return { title: "Confidently Wrong 💀", blurb: "A flawless run… of wrong answers. Impressive, honestly." };
}

export default function PracticePage() {
  const convex = useConvex();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reaction, setReaction] = useState("");
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);

  const load = useCallback(() => {
    setQuestions(null);
    setIndex(0);
    setChoice(null);
    setReaction("");
    setStreak(0);
    setHistory([]);
    const seed = Math.floor(Math.random() * 2 ** 31);
    convex
      .query(api.practice.randomQuiz, { seed, count: 5 })
      .then((qs) => setQuestions(qs as Q[]));
  }, [convex]);

  useEffect(() => {
    load();
  }, [load]);

  if (questions === null) return <Center>Loading…</Center>;
  if (questions.length === 0) {
    return (
      <Center>
        <p className="text-muted">No questions available yet.</p>
        <Link href="/" className="text-gold underline mt-4">
          ← Home
        </Link>
      </Center>
    );
  }

  if (index >= questions.length) {
    const score = history.filter(Boolean).length;
    return <Results score={score} history={history} onAgain={load} />;
  }

  const q = questions[index];
  const answered = choice !== null;
  const gotItRight = answered && choice === q.correctIndex;
  const streakBadge = gotItRight ? STREAK_LINES[Math.min(streak, 5)] : undefined;

  const pick = (i: number) => {
    if (answered) return;
    const correct = i === q.correctIndex;
    setChoice(i);
    setReaction(pickLine(correct ? CORRECT_LINES : WRONG_LINES));
    setStreak((s) => (correct ? s + 1 : 0));
    setHistory((h) => [...h, correct]);
  };
  const next = () => {
    setChoice(null);
    setReaction("");
    setIndex((i) => i + 1);
  };

  return (
    <main className="min-h-screen flex flex-col p-5 max-w-md mx-auto w-full">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/" className="hover:text-cream">
          ← Exit
        </Link>
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="text-gold font-bold">
          {history.filter(Boolean).length} ✓
        </span>
      </div>

      <div className="text-xs text-muted uppercase tracking-wide text-center mt-6">
        {q.category} · {q.difficulty}
      </div>
      <h1 className="mt-2 mb-6 text-center text-2xl font-bold text-cream">
        {q.text}
      </h1>

      <div className="relative grid grid-cols-1 gap-3 content-start">
        {gotItRight && <Burst />}
        {q.options.map((opt, i) => {
          const s = answerStyle(i);
          const isCorrect = i === q.correctIndex;
          const isMine = i === choice;

          let cls = `${s.bg} text-white`;
          if (answered) {
            if (isCorrect) cls = "bg-emerald-600 text-white ring-4 ring-emerald-300";
            else if (isMine) cls = "bg-rose-600 text-white ring-4 ring-rose-300";
            else cls = "bg-surface text-muted opacity-60";
          }

          return (
            <motion.button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              whileTap={answered ? undefined : { scale: 0.97 }}
              animate={
                answered && isCorrect
                  ? { scale: [1, 1.06, 1] }
                  : answered && isMine
                    ? { x: [0, -8, 8, -6, 6, 0] } // shake on wrong pick
                    : {}
              }
              transition={{ duration: 0.4 }}
              className={`rounded-2xl ${cls} px-5 py-4 flex items-center gap-3 text-left text-lg font-bold transition-colors`}
            >
              <span className="text-2xl">{s.shape}</span>
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <span className="text-2xl">✅</span>}
              {answered && isMine && !isCorrect && <span className="text-2xl">❌</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Instant funny feedback + next */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 14 }}
              className="text-center"
            >
              <div
                className={`text-2xl font-black ${gotItRight ? "text-emerald-400" : "text-rose-400"}`}
              >
                {reaction}
              </div>
              {streakBadge && (
                <div className="mt-1 text-lg font-black text-gold">{streakBadge}</div>
              )}
              {!gotItRight && (
                <div className="mt-1 text-sm text-muted">
                  Correct answer: “{q.options[q.correctIndex]}”
                </div>
              )}
            </motion.div>
            <button
              onClick={next}
              className="mt-4 w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
            >
              {index + 1 < questions.length ? "Next question →" : "See results →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// A quick emoji confetti burst from the center of the answers.
function Burst({ big = false }: { big?: boolean }) {
  const emojis = big
    ? ["🎉", "🧠", "✨", "⭐", "🏆", "💥", "👑"]
    : ["🎉", "✨", "🧠", "⭐", "💥"];
  const n = big ? 18 : 10;
  const parts = Array.from({ length: n }).map((_, i) => ({
    e: emojis[i % emojis.length],
    x: (Math.random() - 0.5) * (big ? 420 : 300),
    y: -(Math.random() * (big ? 320 : 200) + 80),
    r: (Math.random() - 0.5) * 120,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${big ? "text-3xl" : "text-2xl"}`}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.3, rotate: p.r }}
          transition={{ duration: big ? 1.4 : 1, ease: "easeOut" }}
        >
          {p.e}
        </motion.span>
      ))}
    </div>
  );
}

function Results({
  score,
  history,
  onAgain,
}: {
  score: number;
  history: boolean[];
  onAgain: () => void;
}) {
  const total = history.length;
  const p = persona(score, total);
  const grid = history.map((c) => (c ? "🟩" : "🟥")).join("");
  const bigWin = score / total >= 0.8;

  return (
    <Center>
      <div className="relative">
        {bigWin && <Burst big />}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
          className="text-center"
        >
          <div className="text-3xl mb-1">{grid}</div>
          <div className="text-7xl font-black text-gold my-1">
            {score}/{total}
          </div>
          <div className="text-2xl font-black text-cream">{p.title}</div>
          <div className="text-muted mt-1 mb-8 max-w-xs mx-auto">{p.blurb}</div>

          <div className="space-y-3 w-full max-w-xs mx-auto">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onAgain}
              className="w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
            >
              Play again 🔁
            </motion.button>
            <Link
              href="/play"
              className="block w-full rounded-full bg-surface hover:bg-surface-2 text-cream px-6 py-4 text-lg font-bold transition"
            >
              Think you&apos;re smart? Compete live →
            </Link>
            <Link href="/" className="block text-muted hover:text-cream text-sm pt-1">
              Home
            </Link>
          </div>
        </motion.div>
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-hero min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

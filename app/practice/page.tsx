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

export default function PracticePage() {
  const convex = useConvex();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const load = useCallback(() => {
    setQuestions(null);
    setIndex(0);
    setChoice(null);
    setScore(0);
    const seed = Math.floor(Math.random() * 2 ** 31);
    convex
      .query(api.practice.randomQuiz, { seed, count: 5 })
      .then((qs) => setQuestions(qs as Q[]));
  }, [convex]);

  useEffect(() => {
    load();
  }, [load]);

  if (questions === null) {
    return <Center>Loading…</Center>;
  }
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

  // Finished.
  if (index >= questions.length) {
    return <Results score={score} total={questions.length} onAgain={load} />;
  }

  const q = questions[index];
  const answered = choice !== null;
  const gotItRight = answered && choice === q.correctIndex;

  const pick = (i: number) => {
    if (answered) return;
    setChoice(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
  };
  const next = () => {
    setChoice(null);
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
        <span className="text-gold font-bold">{score} correct</span>
      </div>

      <div className="text-xs text-muted uppercase tracking-wide text-center mt-6">
        {q.category} · {q.difficulty}
      </div>
      <h1 className="mt-2 mb-6 text-center text-2xl font-bold text-cream">
        {q.text}
      </h1>

      <div className="grid grid-cols-1 gap-3 flex-1 content-start">
        {q.options.map((opt, i) => {
          const s = answerStyle(i);
          const isCorrect = i === q.correctIndex;
          const isMine = i === choice;

          // Color logic: before answering, brand tile color; after, show result.
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

      {/* Instant feedback + next */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <div className="text-center font-black text-xl mb-3">
              {gotItRight ? (
                <span className="text-emerald-400">Correct! ✅</span>
              ) : (
                <span className="text-rose-400">
                  Wrong — it was “{q.options[q.correctIndex]}”
                </span>
              )}
            </div>
            <button
              onClick={next}
              className="w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
            >
              {index + 1 < questions.length ? "Next question →" : "See results →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Results({
  score,
  total,
  onAgain,
}: {
  score: number;
  total: number;
  onAgain: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const blurb =
    pct === 100
      ? "Perfect. Genuinely smart. 🧠"
      : pct >= 60
        ? "Nicely done!"
        : "Keep practicing!";
  return (
    <Center>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="text-center"
      >
        <div className="text-muted">You scored</div>
        <div className="text-7xl font-black text-gold my-2">
          {score}/{total}
        </div>
        <div className="text-xl text-cream mb-8">{blurb}</div>
        <div className="space-y-3 w-full max-w-xs mx-auto">
          <button
            onClick={onAgain}
            className="w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
          >
            Play again
          </button>
          <Link
            href="/"
            className="block w-full rounded-full bg-surface hover:bg-surface-2 text-cream px-6 py-4 text-lg font-bold transition"
          >
            Home
          </Link>
        </div>
      </motion.div>
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

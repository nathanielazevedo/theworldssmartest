"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Burst, DonkeyRain } from "@/app/components/reactions";
import {
  Chip,
  Clock,
  Meter,
  pickHooks,
  scoreLine,
  type HookPools,
} from "@/app/components/record";
import {
  buildTriviaRamp,
  CATEGORY_COLOR,
  difficultyMeta,
  type TriviaQuestion,
} from "./trivia";

/** Tuned for a ~35s vertical Short. Trivia needs a beat longer than the map — */
const ROUNDS = 5;
const AUTO_SECONDS = 6; // you have to read the question, not just glance
const YOU_SECONDS = 7;
const REVEAL_HOLD_MS = 2200;

const HOOKS: HookPools = {
  openers: [
    "Only 1% get all 5 🧠",
    "How smart are you? 🧠",
    "Can you answer this? 🤔",
    `Bet you can't get all ${ROUNDS} 🧠`,
    "Think you're smart? Prove it 🧠",
    "90% fail this quiz 🫏",
  ],
  challenges: [
    "Next question 👀",
    "Getting harder 😏",
    "You know this one?",
    "Think fast! ⚡",
    "Don't overthink it 🤔",
    "This one's tricky 👀",
    "Quick — answer!",
    "Easy points?",
  ],
  finishers: ["Last one — make it count 🏁", "Final question! 🏁"],
};

type Stage = "question" | "revealed" | "ended";

export default function TriviaRecordMode({
  interactive = false,
}: {
  interactive?: boolean;
}) {
  const convex = useConvex();
  const [pool, setPool] = useState<TriviaQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Grab a big pool once; the ramp is rebuilt from it client-side on replay.
  useEffect(() => {
    convex
      .query(api.practice.randomQuiz, {
        seed: Math.floor(Math.random() * 2 ** 31),
        count: 200,
      })
      .then(
        (qs) => setPool(qs as TriviaQuestion[]),
        () => setFailed(true),
      );
  }, [convex]);

  if (failed) {
    return (
      <Center>
        <p className="text-muted">Couldn&apos;t load questions.</p>
        <Link href="/" className="mt-4 text-gold underline">
          ← Home
        </Link>
      </Center>
    );
  }

  if (!pool) {
    return (
      <Center>
        <p className="animate-pulse text-muted">Loading the quiz…</p>
      </Center>
    );
  }

  if (pool.length === 0) {
    return (
      <Center>
        <p className="text-muted">No questions available yet.</p>
        <Link href="/" className="mt-4 text-gold underline">
          ← Home
        </Link>
      </Center>
    );
  }

  return <TriviaGame pool={pool} interactive={interactive} />;
}

function TriviaGame({
  pool,
  interactive,
}: {
  pool: TriviaQuestion[];
  interactive: boolean;
}) {
  const clockSeconds = interactive ? YOU_SECONDS : AUTO_SECONDS;

  const [rounds, setRounds] = useState<TriviaQuestion[]>(() =>
    buildTriviaRamp(pool, ROUNDS),
  );
  const [hooks, setHooks] = useState<string[]>(() => pickHooks(HOOKS, ROUNDS));
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("question");
  const [timeLeft, setTimeLeft] = useState(clockSeconds);
  const [choice, setChoice] = useState<number | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);

  const q = index < rounds.length ? rounds[index] : null;

  // The loop: question + clock -> reveal -> pause -> next. Hands-free unless
  // `interactive`, where a tap resolves early and the clock running out is a miss.
  useEffect(() => {
    if (!q) return;

    if (stage === "question") {
      setTimeLeft(clockSeconds);
      const deadline = Date.now() + clockSeconds * 1000;
      const id = setInterval(() => {
        const remaining = Math.max(0, deadline - Date.now());
        setTimeLeft(remaining / 1000);
        if (remaining <= 0) {
          clearInterval(id);
          if (interactive) setHistory((h) => [...h, false]);
          setStage("revealed");
        }
      }, 50);
      return () => clearInterval(id);
    }

    if (stage === "revealed") {
      const t = setTimeout(() => {
        setChoice(null);
        if (index + 1 < rounds.length) {
          setIndex((i) => i + 1);
          setStage("question");
        } else {
          setStage("ended");
        }
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [stage, q, index, rounds.length, interactive, clockSeconds]);

  const pick = (i: number) => {
    if (!interactive || stage !== "question" || !q) return;
    setChoice(i);
    setHistory((h) => [...h, i === q.correctIndex]);
    setStage("revealed");
  };

  const replay = () => {
    setRounds(buildTriviaRamp(pool, ROUNDS));
    setHooks(pickHooks(HOOKS, ROUNDS));
    setIndex(0);
    setChoice(null);
    setHistory([]);
    setStage("question");
  };

  const revealed = stage === "revealed";
  const gotIt =
    interactive && revealed && choice != null && choice === q?.correctIndex;
  const missed = interactive && revealed && !gotIt;

  const verdictLabel = !interactive
    ? "Correct answer ✓"
    : gotIt
      ? "Correct! 🎉"
      : choice == null
        ? "Time's up! ⏱️"
        : "Nope! 🫏";
  const verdictColor = !interactive || gotIt ? "text-emerald-400" : "text-rose-400";

  return (
    <main className="bg-hero relative h-screen w-full overflow-hidden">
      {/* Top bar — inside the vertical safe zone (clear of the status notch). */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-8 text-sm font-black">
        <span className="text-gold">🧠 DONKEY BRAINS</span>
        {stage !== "ended" &&
          (interactive ? (
            <Meter history={history} total={rounds.length} />
          ) : (
            <span className="text-muted tabular-nums">
              {index + 1}/{rounds.length}
            </span>
          ))}
      </div>

      {stage === "ended" ? (
        <EndCard
          total={rounds.length}
          interactive={interactive}
          score={history.filter(Boolean).length}
          onReplay={replay}
        />
      ) : (
        q && (
          // Centered so the block adapts to question length; pb-32 keeps the
          // tiles above the caption + action-button chrome down the lower third.
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-32 pt-20">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-3 flex justify-center gap-2">
                <Chip label={q.category} color={CATEGORY_COLOR} />
                <Chip
                  label={difficultyMeta(q.difficulty).label}
                  color={difficultyMeta(q.difficulty).color}
                />
              </div>

              {/* Rotating hook — the engagement framing above the question. */}
              <motion.div
                key={`hook-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="mb-2 text-center text-lg font-black text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                {hooks[index]}
              </motion.div>

              {/* The question — the hero. */}
              <motion.h1
                key={`q-${index}`}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className="mb-4 text-center text-2xl font-black leading-tight text-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-3xl"
              >
                {q.text}
              </motion.h1>

              {/* Clock while answering -> verdict on reveal. */}
              <div className="mb-4 flex min-h-[96px] items-center justify-center">
                <AnimatePresence mode="wait">
                  {revealed ? (
                    <motion.div
                      key="verdict"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className={`relative text-3xl font-black sm:text-4xl ${verdictColor}`}
                    >
                      {gotIt && <Burst />}
                      {missed && <DonkeyRain />}
                      {!interactive && <Burst />}
                      {verdictLabel}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="clock"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Clock timeLeft={timeLeft} total={clockSeconds} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.correctIndex;
                  const isMine = interactive && i === choice;

                  let cls = interactive
                    ? "bg-black/70 backdrop-blur text-white border border-white/15 hover:border-white/40"
                    : "bg-black/70 backdrop-blur text-white border border-white/15";
                  if (revealed) {
                    if (isCorrect)
                      cls =
                        "bg-emerald-600 text-white ring-4 ring-emerald-300 border border-transparent";
                    else if (isMine)
                      cls =
                        "bg-rose-600 text-white ring-4 ring-rose-300 border border-transparent";
                    else
                      cls =
                        "bg-black/50 backdrop-blur text-muted opacity-50 border border-transparent";
                  }

                  return (
                    <motion.button
                      key={`${index}-${i}`}
                      onClick={() => pick(i)}
                      disabled={!interactive || revealed}
                      whileTap={
                        interactive && !revealed ? { scale: 0.96 } : undefined
                      }
                      animate={
                        revealed && isCorrect
                          ? { scale: [1, 1.05, 1] }
                          : revealed && isMine
                            ? { x: [0, -6, 6, -4, 4, 0] }
                            : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-bold leading-tight transition-colors ${cls}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </main>
  );
}

function EndCard({
  total,
  interactive,
  score,
  onReplay,
}: {
  total: number;
  interactive: boolean;
  score: number;
  onReplay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 pb-24 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 14 }}
        className="relative"
      >
        <Burst big />
        {interactive ? (
          <>
            <div className="text-6xl">{score === total ? "🧠" : "🫏"}</div>
            <h1 className="wordmark mt-3 text-5xl text-cream sm:text-6xl">
              You got
              <br />
              <span className="text-gold">
                {score}/{total}
              </span>
            </h1>
            <div className="mt-4 text-xl font-black text-cream">
              {scoreLine(score, total)}
            </div>
            <p className="mt-5 text-xl font-black text-cream">
              Can you beat me? <span className="text-gold">👇</span>
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl">🧠</div>
            <h1 className="wordmark mt-3 text-5xl text-cream sm:text-6xl">
              How many did
              <br />
              <span className="text-gold">you get?</span>
            </h1>
            <div className="mt-5 space-y-1 text-xl font-black text-cream">
              <p>
                Comment your score <span className="text-gold">👇</span>
              </p>
              <p className="text-muted">
                {total}/{total} = certified genius 🧠
              </p>
            </div>
          </>
        )}
        <p className="mt-6 text-lg font-black text-gold">
          Follow for a new one daily 🧠
        </p>
      </motion.div>

      <button
        onClick={onReplay}
        className="mt-10 rounded-full bg-gold px-8 py-4 text-lg font-black text-ink transition hover:bg-gold-bright"
      >
        Play again 🔁
      </button>
      <Link href="/practice" className="mt-4 text-sm text-muted hover:text-cream">
        Exit record mode
      </Link>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

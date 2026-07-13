"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useConvex } from "convex/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Q = {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string;
};

// --- Certificates -----------------------------------------------------------
// Heads up: the source files are named the opposite of what they depict.
// These constants are the source of truth — go by the headline, not the path.
const CERT = {
  /** Headline: "YOU DO HAVE DONKEY BRAINS" — shown on a wrong answer. */
  donkey: "/donthave.png",
  /** Headline: "YOU DON'T HAVE DONKEY BRAINS" — shown on a correct answer. */
  smart: "/dohave.png",
} as const;

// --- Funny copy -------------------------------------------------------------
const CORRECT_LINES = [
  "Certified NOT a donkey.",
  "The donkey is furious.",
  "Brain detected. Barely.",
  "Hee-haw? No. Genius.",
  "Somebody's been reading.",
  "Donkey-free… for now.",
  "That's a human brain, folks.",
  "Suspiciously correct.",
];
const WRONG_LINES = [
  "HEE-HAW. 🫏",
  "Donkey brains. Confirmed.",
  "That was 100% donkey.",
  "The donkey nods approvingly.",
  "Straight to the barn with you.",
  "A donkey guessed better.",
  "Confidently, catastrophically wrong.",
  "Big ears. Bigger donkey energy.",
];
const STREAK_LINES: Record<number, string> = {
  2: "🔥 Two in a row",
  3: "🔥🔥 The donkey is sweating",
  4: "🔥🔥🔥 No donkey here",
  5: "🧠 GALAXY BRAIN",
};
function pickLine(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function persona(score: number, total: number) {
  const pct = score / total;
  if (pct === 1)
    return {
      title: "PURE GENIUS 🧠",
      blurb: "Zero donkey detected. Print it. Frame it. Show your mother.",
    };
  if (pct >= 0.8)
    return { title: "Barely Human 🧠", blurb: "Only a faint whiff of donkey." };
  if (pct >= 0.6)
    return {
      title: "Mild Donkey 🫏",
      blurb: "The ears are small, but they're there.",
    };
  if (pct >= 0.4)
    return { title: "Half Donkey 🫏", blurb: "It's a coin flip up there." };
  if (pct > 0)
    return { title: "Certified Donkey 🫏", blurb: "Hee-haw, friend. Hee-haw." };
  return {
    title: "MAXIMUM DONKEY 🫏🫏🫏",
    blurb: "A flawless run of wrong. Majestic, honestly.",
  };
}

export default function PracticePage() {
  return (
    <Suspense fallback={<Center>Loading…</Center>}>
      <PracticeInner />
    </Suspense>
  );
}

function PracticeInner() {
  const convex = useConvex();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [sabotagedIndex, setSabotagedIndex] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reaction, setReaction] = useState("");
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);

  const load = useCallback(() => {
    setQuestions(null);
    setSabotagedIndex(null);
    setIndex(0);
    setChoice(null);
    setReaction("");
    setStreak(0);
    setHistory([]);
    const idsParam = searchParams.get("ids");
    const sabotage = searchParams.get("sabotage") === "1";
    const fetchPromise = idsParam
      ? convex.query(api.practice.quizByIds, {
          ids: idsParam.split(",").filter(Boolean) as Id<"questionBank">[],
        })
      : convex.query(api.practice.randomQuiz, {
          seed: Math.floor(Math.random() * 2 ** 31),
          count: 5,
        });

    fetchPromise.then((qs) => {
      const loaded = qs as Q[];
      if (sabotage && loaded.length > 0) {
        const trapIdx = Math.floor(Math.random() * loaded.length);
        setSabotagedIndex(trapIdx);
        // Flip correctIndex to any other option index
        const trap = loaded[trapIdx];
        const wrong = (trap.correctIndex + 1 + Math.floor(Math.random() * (trap.options.length - 1))) % trap.options.length;
        loaded[trapIdx] = { ...trap, correctIndex: wrong };
      }
      setQuestions(loaded);
    });
  }, [convex, searchParams]);

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
    return (
      <Results
        score={score}
        history={history}
        questions={questions}
        sabotagedIndex={sabotagedIndex}
        onAgain={load}
      />
    );
  }

  const q = questions[index];
  const answered = choice !== null;
  const gotItRight = answered && choice === q.correctIndex;
  const streakBadge = gotItRight
    ? STREAK_LINES[Math.min(streak, 5)]
    : undefined;

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
    <motion.main
      // The whole page recoils when you answer like a donkey.
      animate={answered && !gotItRight ? { x: [0, -10, 10, -7, 7, -3, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="min-h-screen flex flex-col p-5 max-w-md mx-auto w-full"
    >
      <CertPreload />

      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/" className="hover:text-cream">
          ← Exit
        </Link>
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <DonkeyMeter history={history} total={questions.length} />
      </div>

      <div className="text-xs text-muted uppercase tracking-wide text-center mt-6">
        {q.category} · {q.difficulty}
      </div>
      <h1 className="mt-2 mb-8 text-center text-3xl sm:text-4xl font-black text-cream leading-snug">
        {q.text}
      </h1>

      <div className="relative grid grid-cols-1 gap-3 content-start">
        {answered && (gotItRight ? <Burst /> : <DonkeyRain />)}
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isMine = i === choice;

          let cls =
            "bg-black text-white border border-white/10 hover:border-white/30";
          if (answered) {
            if (isCorrect)
              cls = "bg-emerald-600 text-white ring-4 ring-emerald-300";
            else if (isMine)
              cls = "bg-rose-600 text-white ring-4 ring-rose-300";
            else
              cls =
                "bg-surface text-muted opacity-60 border border-transparent";
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
                    ? { x: [0, -8, 8, -6, 6, 0] }
                    : {}
              }
              transition={{ duration: 0.4 }}
              className={`rounded-2xl ${cls} px-5 py-4 flex items-center gap-3 text-left text-lg font-bold transition-colors`}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-sm font-black shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <span className="text-2xl">✅</span>}
              {answered && isMine && !isCorrect && (
                <span className="text-2xl">🫏</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* The verdict: a certificate slams down on the desk. */}
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
              className="text-center mt-4"
            >
              {!gotItRight && (
                <motion.div
                  initial={{ scale: 1.4, rotate: -6, opacity: 0 }}
                  animate={{ scale: 1, rotate: 3, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="mx-auto mb-3 w-28 h-28 rounded-full overflow-hidden"
                >
                  <Image
                    src="/donkey.png"
                    alt="Donkey face"
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}
              <div
                className={`text-2xl font-black ${gotItRight ? "text-emerald-400" : "text-rose-400"}`}
              >
                {reaction}
              </div>
              {streakBadge && (
                <div className="mt-1 text-lg font-black text-gold">
                  {streakBadge}
                </div>
              )}
              {!gotItRight && (
                <div className="mt-1 text-sm text-muted">
                  A non-donkey would have said “{q.options[q.correctIndex]}”
                </div>
              )}
            </motion.div>

            <button
              onClick={next}
              className="mt-4 w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
            >
              {index + 1 < questions.length
                ? gotItRight
                  ? "Next question →"
                  : "Redeem yourself →"
                : "See final verdict →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

/**
 * The certificate reveal. Slams in rotated, like a stamp hitting paper, then
 * settles. `smart` picks which of the two certificates gets awarded.
 */
function Certificate({
  smart,
  big = false,
}: {
  smart: boolean;
  big?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.6, rotate: smart ? 8 : -8, y: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: smart ? -1.5 : 2, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 18, mass: 0.8 }}
      className={`relative mx-auto w-full overflow-hidden rounded-xl ring-4 ${
        smart ? "ring-emerald-400/70" : "ring-rose-500/70"
      } ${big ? "max-w-md" : "max-w-xs"} shadow-2xl`}
    >
      <Image
        src={smart ? CERT.smart : CERT.donkey}
        alt={
          smart
            ? "Official certificate: you don't have donkey brains"
            : "Official certificate: you do have donkey brains"
        }
        width={1492}
        height={1054}
        sizes="(max-width: 448px) 100vw, 384px"
        className="h-auto w-full"
        priority
      />
    </motion.div>
  );
}

/**
 * Both certificates are ~1500px wide, so warm the optimizer cache on mount —
 * otherwise the first verdict pops in a beat late and kills the joke.
 */
function CertPreload() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
    >
      <Image src={CERT.smart} alt="" width={384} height={271} priority />
      <Image src={CERT.donkey} alt="" width={384} height={271} priority />
    </div>
  );
}

/** Brains vs. donkeys, filled in as you go. */
function DonkeyMeter({
  history,
  total,
}: {
  history: boolean[];
  total: number;
}) {
  return (
    <span className="flex gap-1 text-sm" title="Your brain, so far">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          initial={i < history.length ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
          className={i >= history.length ? "opacity-25" : ""}
        >
          {i >= history.length ? "•" : history[i] ? "🧠" : "🫏"}
        </motion.span>
      ))}
    </span>
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

/** The shame equivalent of confetti: donkeys tumbling down the screen. */
function DonkeyRain({ big = false }: { big?: boolean }) {
  const n = big ? 16 : 9;
  const parts = Array.from({ length: n }).map(() => ({
    x: (Math.random() - 0.5) * (big ? 400 : 300),
    delay: Math.random() * 0.35,
    r: (Math.random() - 0.5) * 200,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center overflow-visible">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${big ? "text-4xl" : "text-3xl"}`}
          initial={{ opacity: 0, x: p.x, y: -140, scale: 0.6, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: big ? 340 : 260,
            scale: 1,
            rotate: p.r,
          }}
          transition={{ duration: 1.3, delay: p.delay, ease: "easeIn" }}
        >
          🫏
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
  questions: Q[];
  sabotagedIndex: number | null;
  onAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const total = history.length;
  const p = persona(score, total);
  const grid = history.map((c) => (c ? "🧠" : "🫏")).join(" ");
  // You have to actually beat the donkey to walk away with the good certificate.
  const smart = score / total >= 0.6;

  const share = async () => {
    const text = `Do You Have Donkey Brains? ${score}/${total}\n${grid}\n${p.title}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — no-op.
    }
  };

  return (
    <Center>
      <div className="relative">
        {smart ? <Burst big /> : <DonkeyRain big />}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
          className="text-center"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-muted mb-3">
            Final ruling
          </div>

          <Certificate smart={smart} big />

          <div className="text-3xl mt-5 mb-1">{grid}</div>
          <div className="text-6xl font-black text-gold my-1">
            {score}/{total}
          </div>
          <div className="text-2xl font-black text-cream">{p.title}</div>
          <div className="text-muted mt-1 mb-7 max-w-xs mx-auto">{p.blurb}</div>

          <div className="space-y-3 w-full max-w-xs mx-auto">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onAgain}
              className="w-full rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-4 text-lg font-black transition"
            >
              {smart ? "Defend your title 🔁" : "Try again 🔁"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={share}
              className="w-full rounded-full bg-surface hover:bg-surface-2 text-cream px-6 py-4 text-lg font-bold transition"
            >
              {copied
                ? "Copied! Go humiliate a friend 📋"
                : "Share your diagnosis 🫏"}
            </motion.button>
            <Link
              href="/"
              className="block text-muted hover:text-cream text-sm pt-1"
            >
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

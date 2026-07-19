"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { Burst, DonkeyRain } from "@/app/components/reactions";
import { Chip, Clock } from "@/app/components/record";
import {
  loadCountries,
  flagEmoji,
  type CountryFeature,
  type CountryProps,
} from "@/app/globe/countries";
import { createPicker, difficultyForRatio, type Pair } from "./pairs";

const TIMER_SECONDS = 8; // a touch longer than the map — you read two names
const BEST_KEY = "higher.bestStreak";

const CORRECT_LINES = ["Nailed it 🧠", "Correct!", "Too easy?", "Sharp.", "Keep going 🔥"];
const WRONG_LINES = ["HEE-HAW. 🫏", "Nope!", "So close…", "Donkey Brains! 🫏"];
const TIMEOUT_LINES = ["Too slow! 🫏", "Tick, tock, hee-haw.", "Time's up!"];
const END_LINES = [
  "Can you beat me? 👇",
  "Bet you can't beat this 👇",
  "Drop your streak below 👇",
];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

type Phase = "idle" | "playing" | "revealed" | "ended";

export default function HigherPage() {
  return (
    <Suspense fallback={<main className="bg-hero min-h-screen" />}>
      <HigherRouter />
    </Suspense>
  );
}

function HigherRouter() {
  const recordMode = useSearchParams().get("record") === "me";
  return <StreakGame recordMode={recordMode} />;
}

function StreakGame({ recordMode }: { recordMode: boolean }) {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  const pickerRef = useRef<ReturnType<typeof createPicker> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairId, setPairId] = useState(0);
  const [choice, setChoice] = useState<"a" | "b" | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [reaction, setReaction] = useState("");

  useEffect(() => {
    loadCountries().then(setCountries, () => setFailed(true));
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    }
  }, []);

  const start = useCallback(() => {
    if (!countries) return;
    const picker = createPicker(countries);
    pickerRef.current = picker;
    setStreak(0);
    setNewBest(false);
    setChoice(null);
    setReaction("");
    setPair(picker.next(0));
    setPairId((id) => id + 1);
    setPhase("playing");
  }, [countries]);

  // Record mode cold-opens straight into a run.
  useEffect(() => {
    if (recordMode && countries && phase === "idle") start();
  }, [recordMode, countries, phase, start]);

  const resolve = useCallback(
    (side: "a" | "b" | null) => {
      if (phase !== "playing" || !pair) return;
      const correct =
        side !== null &&
        (side === "a"
          ? pair.a.pop > pair.b.pop
          : pair.b.pop > pair.a.pop);
      setChoice(side);
      setReaction(pick(correct ? CORRECT_LINES : side === null ? TIMEOUT_LINES : WRONG_LINES));
      if (correct) setStreak((s) => s + 1);
      setPhase("revealed");
    },
    [phase, pair],
  );

  // Countdown; running out is a miss.
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(TIMER_SECONDS);
    const deadline = Date.now() + TIMER_SECONDS * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        resolve(null);
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, pairId, resolve]);

  // After a reveal: advance on a correct answer, or end the run.
  useEffect(() => {
    if (phase !== "revealed" || !pair) return;
    const correct =
      choice !== null &&
      (choice === "a" ? pair.a.pop > pair.b.pop : pair.b.pop > pair.a.pop);
    const t = setTimeout(
      () => {
        if (correct) {
          setChoice(null);
          setPair(pickerRef.current!.next(streak));
          setPairId((id) => id + 1);
          setPhase("playing");
        } else {
          if (streak > best) {
            setBest(streak);
            setNewBest(true);
            if (typeof window !== "undefined") {
              localStorage.setItem(BEST_KEY, String(streak));
            }
          }
          setPhase("ended");
        }
      },
      correct ? 950 : 1600,
    );
    return () => clearTimeout(t);
  }, [phase, choice, pair, streak, best]);

  if (failed) {
    return (
      <Center>
        <p className="text-muted">Couldn&apos;t load country data.</p>
        <Link href="/" className="mt-4 text-gold underline">
          ← Home
        </Link>
      </Center>
    );
  }
  if (!countries || (recordMode && phase === "idle")) {
    return (
      <Center>
        <p className="animate-pulse text-muted">Loading…</p>
      </Center>
    );
  }
  if (phase === "idle") return <Setup onPlay={start} best={best} />;
  if (phase === "ended")
    return (
      <EndScreen
        streak={streak}
        best={best}
        newBest={newBest}
        recordMode={recordMode}
        onAgain={start}
      />
    );
  if (!pair) return null;

  const revealed = phase === "revealed";
  const correctSide: "a" | "b" = pair.a.pop > pair.b.pop ? "a" : "b";
  const ratio =
    Math.max(pair.a.pop, pair.b.pop) / Math.min(pair.a.pop, pair.b.pop);
  const diff = difficultyForRatio(ratio);

  return (
    <main className="bg-hero relative flex h-screen w-full flex-col overflow-hidden">
      {/* Top bar — streak left, best/exit right (safe zone padding). */}
      <div
        className={`z-20 flex items-center justify-between px-5 text-sm font-black ${
          recordMode ? "pt-8" : "pt-5"
        }`}
      >
        <span className="text-gold">🔥 {streak}</span>
        {recordMode ? (
          <span className="text-muted">Best {best}</span>
        ) : (
          <Link href="/" className="text-muted hover:text-cream">
            ← Exit
          </Link>
        )}
      </div>

      {/* Prompt + clock. */}
      <div className="z-20 flex flex-col items-center gap-2 pt-2">
        <Chip label={diff.label} color={diff.color} />
        <h1
          className={`text-center font-black text-cream ${
            recordMode ? "text-2xl" : "text-xl"
          }`}
        >
          Who has more people?
        </h1>
        <div className="h-16">
          {!revealed && (
            <Clock timeLeft={timeLeft} total={TIMER_SECONDS} big={recordMode} />
          )}
        </div>
      </div>

      {/* Two cards. */}
      <div className="relative flex flex-1 flex-col px-4 pb-6">
        {revealed &&
          (choice === correctSide ? <Burst /> : <DonkeyRain />)}
        <Card
          c={pair.a}
          side="a"
          onPick={resolve}
          revealed={revealed}
          chosen={choice}
          correctSide={correctSide}
          recordMode={recordMode}
        />
        <div className="relative z-10 -my-4 flex items-center justify-center">
          <span className="rounded-full border border-line bg-ink px-4 py-1 text-sm font-black text-muted">
            VS
          </span>
        </div>
        <Card
          c={pair.b}
          side="b"
          onPick={resolve}
          revealed={revealed}
          chosen={choice}
          correctSide={correctSide}
          recordMode={recordMode}
        />
      </div>
    </main>
  );
}

function Card({
  c,
  side,
  onPick,
  revealed,
  chosen,
  correctSide,
  recordMode,
}: {
  c: CountryProps;
  side: "a" | "b";
  onPick: (s: "a" | "b") => void;
  revealed: boolean;
  chosen: "a" | "b" | null;
  correctSide: "a" | "b";
  recordMode: boolean;
}) {
  const isWinner = correctSide === side;
  const isChosen = chosen === side;
  let ring = "border border-line";
  if (revealed)
    ring = isWinner
      ? "ring-4 ring-emerald-300 border border-transparent"
      : isChosen
        ? "ring-4 ring-rose-300 border border-transparent"
        : "border border-line opacity-60";

  return (
    <motion.button
      onClick={() => onPick(side)}
      disabled={revealed}
      data-side={side}
      data-pop={c.pop}
      whileTap={revealed ? undefined : { scale: 0.98 }}
      animate={
        revealed && isWinner
          ? { scale: [1, 1.03, 1] }
          : revealed && isChosen && !isWinner
            ? { x: [0, -8, 8, -4, 4, 0] }
            : {}
      }
      transition={{ duration: 0.4 }}
      className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl bg-surface/60 backdrop-blur transition-colors ${ring}`}
    >
      <span className={recordMode ? "text-7xl" : "text-6xl"}>
        {flagEmoji(c.iso)}
      </span>
      <span
        className={`font-black leading-tight text-cream ${
          recordMode ? "text-3xl" : "text-2xl"
        }`}
      >
        {c.name}
      </span>
      {revealed ? (
        <div
          className={`font-black ${recordMode ? "text-4xl" : "text-3xl"} ${
            isWinner ? "text-emerald-400" : isChosen ? "text-rose-400" : "text-muted"
          }`}
        >
          <CountUp value={c.pop} />
        </div>
      ) : (
        <div
          className={`font-black text-muted ${recordMode ? "text-4xl" : "text-3xl"}`}
        >
          ?
        </div>
      )}
      <div className="text-xs uppercase tracking-[0.2em] text-muted">people</div>
    </motion.button>
  );
}

/** Counts up from 0 to the real population on reveal. */
function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.85, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

function Setup({ onPlay, best }: { onPlay: () => void; best: number }) {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="wordmark text-5xl text-cream sm:text-6xl">
          Higher or
          <br />
          <span className="text-gold">Lower?</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm text-muted">
          Two countries. Tap the one with more people. How long can your streak
          survive? 🌍
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPlay}
        className="rounded-full bg-gold px-14 py-5 text-2xl font-black text-ink shadow-[0_0_50px_-8px] shadow-gold/60 transition hover:bg-gold-bright"
      >
        Play 🌍
      </motion.button>

      {best > 0 && (
        <div className="text-sm font-black text-gold">🔥 Best streak: {best}</div>
      )}

      <div className="flex flex-col items-center gap-2">
        <Link href="/" className="text-sm text-muted hover:text-cream">
          ← Home
        </Link>
        <span className="text-xs text-muted/50">Population figures · 2019</span>
      </div>
    </main>
  );
}

function EndScreen({
  streak,
  best,
  newBest,
  recordMode,
  onAgain,
}: {
  streak: number;
  best: number;
  newBest: boolean;
  recordMode: boolean;
  onAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const smart = streak >= 5;

  const share = async () => {
    const text = `Higher or Lower? Streak: ${streak} 🔥\nBeat me 👇`;
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
          {newBest && (
            <div className="mb-2 text-lg font-black text-gold">🔥 NEW BEST</div>
          )}
          <div className="text-xs uppercase tracking-[0.2em] text-muted">
            Your streak
          </div>
          <div className="my-1 text-7xl font-black text-gold">{streak}</div>
          <div className="text-lg font-black text-cream">
            {smart ? "Certified geographer 🧠" : "Donkey Brains 🫏"}
          </div>
          <div className="mt-1 text-muted">Best: {best}</div>

          <div className="mx-auto mt-7 w-full max-w-xs space-y-3">
            <div className="text-base font-black text-gold">{pick(END_LINES)}</div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onAgain}
              className="w-full rounded-full bg-gold px-6 py-4 text-lg font-black text-ink transition hover:bg-gold-bright"
            >
              Play again 🔁
            </motion.button>
            {recordMode ? (
              <>
                <div className="text-sm font-black text-gold">
                  Follow for a new one daily 🌍
                </div>
                <Link
                  href="/higher"
                  className="block text-sm text-muted hover:text-cream"
                >
                  Exit record mode
                </Link>
              </>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={share}
                  className="w-full rounded-full bg-surface px-6 py-4 text-lg font-bold text-cream transition hover:bg-surface-2"
                >
                  {copied ? "Copied! Go humiliate a friend 📋" : "Share your streak 🔥"}
                </motion.button>
                <Link href="/" className="block text-sm text-muted hover:text-cream">
                  Home
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

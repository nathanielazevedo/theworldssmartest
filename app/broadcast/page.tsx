"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
} from "framer-motion";
import { api } from "@/convex/_generated/api";
import { answerStyle } from "@/app/lib/answerStyles";

type State = NonNullable<FunctionReturnType<typeof api.games.current>>;

export default function BroadcastPage() {
  const state = useQuery(api.games.current);
  const leaderboard = useQuery(
    api.players.leaderboard,
    state ? { gameId: state._id } : "skip",
  );
  const counts = useQuery(
    api.answers.liveCounts,
    state?.question ? { gameId: state._id, questionId: state.question._id } : "skip",
  );

  if (state === undefined) return <Frame>Loading…</Frame>;
  if (state === null) return <Frame>Waiting for the host to start a game…</Frame>;

  // Key drives the crossfade: changes on every status change and new question.
  const viewKey =
    state.status === "question" || state.status === "reveal"
      ? `${state.status}-${state.currentIndex}`
      : state.status;

  return (
    <Frame>
      <AnimatePresence mode="wait">
        <motion.div
          key={viewKey}
          className="flex-1 flex flex-col"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {state.status === "lobby" && <Lobby players={leaderboard ?? []} />}
          {state.status === "question" && state.question && (
            <QuestionView state={state} total={counts?.total ?? 0} />
          )}
          {state.status === "reveal" && state.question && (
            <RevealView state={state} counts={counts} />
          )}
          {state.status === "leaderboard" && (
            <Leaderboard players={leaderboard ?? []} title="Leaderboard" />
          )}
          {state.status === "ended" && (
            <Leaderboard players={leaderboard ?? []} title="🏆 Final Results" />
          )}
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

// Animated whole-number counter.
function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, mv]);
  return <>{display.toLocaleString()}</>;
}

// Fixed 16:9 stage tuned for an OBS browser source at 1920×1080.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-broadcast min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[1600px] aspect-video p-12 flex flex-col">
        {children}
      </div>
    </div>
  );
}

function Lobby({ players }: { players: { _id: string; name: string }[] }) {
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    setJoinUrl(`${window.location.host}/play`);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
      <img
        src="/logo.png"
        alt="Do You Have Donkey Brains?"
        className="w-64 drop-shadow-2xl"
      />
      <div className="text-3xl font-bold text-white/70">Join the game on your phone</div>
      <div>
        <div className="text-2xl text-white/60 uppercase tracking-widest">Go to</div>
        <motion.div
          className="text-[6rem] leading-none font-black tracking-tight text-gold drop-shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {joinUrl || "…"}
        </motion.div>
      </div>
      <motion.div
        key={players.length}
        className="text-4xl font-bold"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        {players.length} player{players.length === 1 ? "" : "s"} in
      </motion.div>
      <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
        <AnimatePresence>
          {players.slice(0, 24).map((p) => (
            <motion.span
              key={p._id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="rounded-full bg-white/15 px-5 py-2 text-xl font-semibold"
            >
              {p.name}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Countdown({
  startedAt,
  limitSec,
}: {
  startedAt: number | null;
  limitSec: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return null;
  const remaining = Math.max(
    0,
    Math.ceil((startedAt + limitSec * 1000 - now) / 1000),
  );
  const frac = Math.max(0, Math.min(1, remaining / limitSec));
  const low = remaining <= 5;
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="44" className="stroke-white/20" strokeWidth="10" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="44"
          className={`transition-all duration-100 ${low ? "stroke-rose-500" : "stroke-gold"}`}
          strokeWidth="10"
          fill="none"
          strokeDasharray={2 * Math.PI * 44}
          strokeDashoffset={2 * Math.PI * 44 * (1 - frac)}
          strokeLinecap="round"
        />
      </svg>
      <motion.div
        key={remaining}
        initial={{ scale: low ? 1.4 : 1.15, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={`absolute inset-0 flex items-center justify-center text-5xl font-black ${low ? "text-rose-500" : "text-gold"}`}
      >
        {remaining}
      </motion.div>
    </div>
  );
}

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const tileVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

function QuestionView({ state, total }: { state: State; total: number }) {
  const q = state.question!;
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="text-2xl font-bold text-white/60">
          Question {state.currentIndex + 1} / {state.totalQuestions}
        </div>
        <Countdown startedAt={state.questionStartedAt} limitSec={q.timeLimitSec} />
      </div>

      <div className="flex-1 flex items-center justify-center text-center px-8">
        <motion.h1
          className="text-6xl font-black leading-tight drop-shadow-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {q.text}
        </motion.h1>
      </div>

      <motion.div
        className="grid grid-cols-2 gap-5"
        variants={gridVariants}
        initial="hidden"
        animate="show"
      >
        {q.options.map((opt, i) => {
          const s = answerStyle(i);
          return (
            <motion.div
              key={i}
              variants={tileVariants}
              className={`${s.bg} rounded-2xl px-8 py-6 flex items-center gap-5 text-3xl font-bold shadow-xl`}
            >
              <span className="text-4xl">{s.shape}</span>
              <span>{opt}</span>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-6 text-center text-3xl font-bold text-white/80">
        <CountUp value={total} /> answered
      </div>
    </div>
  );
}

function RevealView({
  state,
  counts,
}: {
  state: State;
  counts: { total: number; counts: Record<number, number> } | undefined;
}) {
  const q = state.question!;
  const total = counts?.total ?? 0;
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center text-center px-8">
        <h1 className="text-5xl font-black leading-tight">{q.text}</h1>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {q.options.map((opt, i) => {
          const s = answerStyle(i);
          const n = counts?.counts[i] ?? 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const isCorrect = q.correctIndex === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: isCorrect ? 1 : 0.55,
                y: 0,
                scale: isCorrect ? [1, 1.06, 1] : 1,
              }}
              transition={{
                delay: i * 0.06,
                scale: { delay: 0.35, duration: 0.5 },
              }}
              className={`rounded-2xl overflow-hidden shadow-xl ${
                isCorrect ? "ring-4 ring-white" : ""
              }`}
            >
              <div
                className={`${s.bg} px-8 py-6 flex items-center justify-between text-3xl font-bold`}
              >
                <span className="flex items-center gap-4">
                  <span className="text-4xl">{s.shape}</span>
                  {opt}
                  {isCorrect && (
                    <motion.span
                      className="text-4xl"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.45, type: "spring", stiffness: 400 }}
                    >
                      ✅
                    </motion.span>
                  )}
                </span>
                <span>
                  <CountUp value={n} />
                </span>
              </div>
              <div className="h-3 bg-black/30">
                <motion.div
                  className="h-full bg-white/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({
  players,
  title,
}: {
  players: { _id: string; name: string; score: number; rank: number }[];
  title: string;
}) {
  const top = players.slice(0, 8);
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8">
      <motion.h1
        className="text-6xl font-black"
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        {title}
      </motion.h1>
      <div className="w-full max-w-3xl space-y-3">
        {top.map((p, idx) => (
          <motion.div
            key={p._id}
            layout
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + idx * 0.12, type: "spring", stiffness: 260, damping: 22 }}
            className={`flex items-center justify-between rounded-2xl px-8 py-5 text-3xl font-bold ${
              p.rank === 1
                ? "bg-gold text-ink"
                : p.rank === 2
                  ? "bg-slate-300 text-black"
                  : p.rank === 3
                    ? "bg-amber-700"
                    : "bg-white/10"
            }`}
          >
            <span className="flex items-center gap-5">
              <span className="w-12 text-center">#{p.rank}</span>
              {p.name}
            </span>
            <span className="font-mono">
              <CountUp value={p.score} />
            </span>
          </motion.div>
        ))}
        {top.length === 0 && (
          <div className="text-center text-2xl text-white/60">No players yet</div>
        )}
      </div>
    </div>
  );
}

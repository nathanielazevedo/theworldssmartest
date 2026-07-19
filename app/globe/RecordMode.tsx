"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Burst } from "@/app/components/reactions";
import {
  Chip,
  Clock,
  Meter,
  pickHooks,
  scoreLine,
  type HookPools,
} from "@/app/components/record";
import {
  buildRampRounds,
  flagEmoji,
  type CountryFeature,
  type CountryProps,
  type Round,
} from "./countries";
import { useLightGlobe } from "./useLightGlobe";
import type { Phase } from "./GlobeCanvas";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

/** Tuned for a ~30s vertical Short: a fast loop that never sits still. */
const ROUNDS = 5;
const AUTO_SECONDS = 4; // hands-free: just long enough to read the options
const YOU_SECONDS = 5; // you-answer: a beat more to actually tap
const SPIN_MS = () => 450 + Math.random() * 350;
const REVEAL_HOLD_MS = 1900;

// Rotating hooks. Round 1 gets a scroll-stopping opener; the last round gets a
// finisher; the middle rotates through challenge lines. Shuffled per run so no
// two recordings open the same way.
const OPENERS = [
  "Can you name it? 🌍",
  "90% CAN'T name this 🌍",
  "How good is your geography? 🌍",
  "Name it before the clock ⏱️",
  `Bet you can't get all ${ROUNDS} 🌍`,
  "Only geniuses get these 🧠",
];
const CHALLENGES = [
  "Name this country",
  "Next one… 👀",
  "You got this?",
  "Getting trickier 😏",
  "How about this one?",
  "Don't overthink it 🤔",
  "This one's sneaky 👀",
  "Quick — name it!",
];
const FINISHERS = ["Last one — make it count 🏁", "Final country! 🏁"];
const HOOKS: HookPools = {
  openers: OPENERS,
  challenges: CHALLENGES,
  finishers: FINISHERS,
};

type Stage = Phase | "ended";

export default function RecordMode({
  countries,
  interactive = false,
}: {
  countries: CountryFeature[];
  /** When true, you tap the answers and it scores you; otherwise hands-free. */
  interactive?: boolean;
}) {
  const clockSeconds = interactive ? YOU_SECONDS : AUTO_SECONDS;
  const [light] = useLightGlobe();

  const [rounds, setRounds] = useState<Round[]>(() =>
    buildRampRounds(countries, ROUNDS),
  );
  const [hooks, setHooks] = useState<string[]>(() => pickHooks(HOOKS, ROUNDS));
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("spinning");
  const [timeLeft, setTimeLeft] = useState(clockSeconds);
  const [choice, setChoice] = useState<number | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);

  const round = index < rounds.length ? rounds[index] : null;

  // The loop: spin -> hold on target with a clock -> reveal -> pause -> next.
  // Hands-free unless `interactive`, where a tap resolves the round early and
  // the clock running out counts as a miss.
  useEffect(() => {
    if (!round) return;

    if (stage === "spinning") {
      const t = setTimeout(() => setStage("guessing"), SPIN_MS());
      return () => clearTimeout(t);
    }

    if (stage === "guessing") {
      setTimeLeft(clockSeconds);
      const deadline = Date.now() + clockSeconds * 1000;
      const id = setInterval(() => {
        const remaining = Math.max(0, deadline - Date.now());
        setTimeLeft(remaining / 1000);
        if (remaining <= 0) {
          clearInterval(id);
          if (interactive) setHistory((h) => [...h, false]); // timed out = miss
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
          setStage("spinning");
        } else {
          setStage("ended");
        }
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [stage, round, index, rounds.length, interactive, clockSeconds]);

  const pick = (i: number) => {
    if (!interactive || stage !== "guessing" || !round) return;
    setChoice(i);
    setHistory((h) => [...h, i === round.correctIndex]);
    setStage("revealed");
  };

  const replay = () => {
    setRounds(buildRampRounds(countries, ROUNDS));
    setHooks(pickHooks(HOOKS, ROUNDS));
    setIndex(0);
    setChoice(null);
    setHistory([]);
    setStage("spinning");
  };

  const revealed = stage === "revealed";
  const target = stage === "spinning" || !round ? null : round.target.properties;
  const correct = round ? round.options[round.correctIndex] : null;
  const gotIt =
    interactive && revealed && choice != null && choice === round?.correctIndex;
  // On a wrong tap, light up the country you actually pointed at, in red.
  const wrongPick: CountryProps | null =
    interactive && revealed && choice != null && choice !== round?.correctIndex
      ? round!.options[choice]
      : null;

  const revealLabel = !interactive
    ? "It's"
    : gotIt
      ? "You got it! 🎉"
      : choice == null
        ? "Time's up ⏱️"
        : "Nope — it's";
  const revealColor = !interactive || gotIt ? "text-emerald-400" : "text-rose-400";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-ink">
      {/* Lift the globe into the top half so the centered country never lands
          under the clock/chip/answers below it. Centered again on the end card. */}
      <div
        className={`absolute inset-0 transition-transform duration-500 ${
          stage === "ended" ? "" : "-translate-y-[21%]"
        }`}
      >
        <GlobeCanvas
          countries={countries}
          target={stage === "ended" ? null : target}
          wrongPick={stage === "ended" ? null : wrongPick}
          phase={stage === "ended" ? "spinning" : (stage as Phase)}
          lightMode={light}
        />
      </div>

      {/* Readability panel: clear over the lifted country up top, ramping to
          near-solid ink behind the text and answer tiles below. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_34%,rgba(13,13,13,0.55)_52%,rgba(13,13,13,0.92)_68%,#0d0d0d_100%)]" />

      {/* Top bar — inside the vertical safe zone (clear of the status notch). */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-8 text-sm font-black">
        <span className="text-gold">🌍 NAME THE COUNTRY</span>
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
        round && (
          // Bottom block sits above pb-32: keeps the tiles clear of the caption
          // + action-button chrome YouTube/TikTok paint over the lower third.
          <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-32">
            <div className="mx-auto w-full max-w-md">
              {round.difficulty && (
                <div className="mb-3 flex justify-center">
                  <Chip
                    label={round.difficulty.label}
                    color={round.difficulty.color}
                  />
                </div>
              )}

              {/* The hook: prominent, persistent for the whole round (it doesn't
                  vanish on reveal), and rotating per round + per run. */}
              <motion.h1
                key={index}
                initial={{ opacity: 0, y: 14, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="mb-3 text-center text-3xl font-black leading-tight text-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl"
              >
                {hooks[index]}
              </motion.h1>

              {/* min-h reserves the taller of clock/answer so nothing jumps. */}
              <div className="mb-4 flex min-h-[104px] items-center justify-center">
                <AnimatePresence mode="wait">
                  {revealed ? (
                    <motion.div
                      key="reveal"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className="relative text-center"
                    >
                      {(!interactive || gotIt) && <Burst />}
                      <div
                        className={`text-sm font-black uppercase tracking-[0.2em] ${revealColor}`}
                      >
                        {revealLabel}
                      </div>
                      <div className="text-4xl font-black text-cream sm:text-5xl">
                        {flagEmoji(correct!.iso)} {correct!.name}
                      </div>
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
                {round.options.map((opt, i) => {
                  const isCorrect = i === round.correctIndex;
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
                      key={opt.name}
                      onClick={() => pick(i)}
                      disabled={!interactive || revealed}
                      whileTap={
                        interactive && !revealed ? { scale: 0.96 } : undefined
                      }
                      animate={
                        revealed && isCorrect
                          ? { scale: [1, 1.06, 1] }
                          : revealed && isMine
                            ? { x: [0, -6, 6, -4, 4, 0] }
                            : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`flex min-h-16 items-center justify-center rounded-2xl px-4 py-3 text-center text-base font-bold leading-tight transition-colors ${cls}`}
                    >
                      {revealed && (isCorrect || isMine) && (
                        <span className="mr-1.5">{flagEmoji(opt.iso)}</span>
                      )}
                      {opt.name}
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
            <div className="text-6xl">{score === total ? "🧠" : "🌍"}</div>
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
            <div className="text-6xl">🌍</div>
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
          Follow for a new one daily 🌍
        </p>
      </motion.div>

      <button
        onClick={onReplay}
        className="mt-10 rounded-full bg-gold px-8 py-4 text-lg font-black text-ink transition hover:bg-gold-bright"
      >
        Play again 🔁
      </button>
      <Link href="/globe" className="mt-4 text-sm text-muted hover:text-cream">
        Exit record mode
      </Link>
    </div>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Burst, DonkeyRain } from "@/app/components/reactions";
import {
  buildRounds,
  flagEmoji,
  loadCountries,
  type CountryFeature,
  type Round,
} from "./countries";
import RecordMode from "./RecordMode";
import SpinChallenge from "./SpinChallenge";
import { useLightGlobe } from "./useLightGlobe";
import type { Phase } from "./GlobeCanvas";

// three.js touches `window` at import time, so it can never run through SSR.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

const ROUND_OPTIONS = [5, 10, 15];

const CORRECT_LINES = [
  "Certified map-reader.",
  "The donkey is holding the atlas upside down.",
  "Geography: unlocked.",
  "Suspiciously worldly.",
  "You've clearly left the house.",
  "Correct. The donkey is furious.",
  "Hee-haw? No. Cartographer.",
];
const WRONG_LINES = [
  "HEE-HAW. 🫏",
  "Wrong hemisphere, champ.",
  "A donkey with a dartboard does better.",
  "You'd get lost in a cul-de-sac.",
  "Straight to the barn with you.",
  "That's not even close.",
  "Confidently, catastrophically wrong.",
];
const TIMEOUT_LINES = [
  "Too slow! 🫏",
  "The donkey answered before you.",
  "Tick, tock, hee-haw.",
  "Frozen like a deer. Or a donkey.",
  "Time's up — the map won.",
];

/** Seconds on the clock for each guess. */
const TIMER_SECONDS = 5;

const STREAK_LINES: Record<number, string> = {
  2: "🔥 Two in a row",
  3: "🔥🔥 The donkey is sweating",
  4: "🔥🔥🔥 Globetrotter",
  5: "🌍 ATLAS BRAIN",
};

function pickLine(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function persona(score: number, total: number) {
  const pct = total === 0 ? 0 : score / total;
  if (pct === 1)
    return {
      title: "ATLAS INCARNATE 🌍",
      blurb: "You have seen every map ever printed. Zero donkey detected.",
    };
  if (pct >= 0.8)
    return {
      title: "Seasoned Traveler 🧭",
      blurb: "Only the faintest whiff of donkey.",
    };
  if (pct >= 0.6)
    return {
      title: "Weekend Tourist 🗺️",
      blurb: "You'd survive with a map. Barely.",
    };
  if (pct >= 0.4)
    return {
      title: "Half Donkey 🫏",
      blurb: "You think Australia is somewhere near Austria.",
    };
  if (pct > 0)
    return {
      title: "Certified Donkey 🫏",
      blurb: "Hee-haw, friend. Hee-haw.",
    };
  return {
    title: "MAXIMUM DONKEY 🫏🫏🫏",
    blurb: "A flawless run of wrong. Majestic, honestly.",
  };
}

export default function GlobePage() {
  return (
    <Suspense fallback={<main className="h-screen w-full bg-ink" />}>
      <GlobeGame />
    </Suspense>
  );
}

function GlobeGame() {
  const params = useSearchParams();
  const record = params.has("record");
  // ?record=1 -> hands-free bot; ?record=me -> you tap the answers;
  // ?record=spin -> single-question spin-the-globe challenge.
  const recordVal = params.get("record");
  const interactive = recordVal === "me";
  const spin = recordVal === "spin";
  const [light, setLight] = useLightGlobe();
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("spinning");
  const [choice, setChoice] = useState<number | null>(null);
  const [reaction, setReaction] = useState("");
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  useEffect(() => {
    loadCountries().then(setCountries, () => setFailed(true));
  }, []);

  const start = useCallback(
    (count: number) => {
      if (!countries) return;
      setRounds(buildRounds(countries, count));
      setIndex(0);
      setChoice(null);
      setReaction("");
      setStreak(0);
      setHistory([]);
      setPhase("spinning");
    },
    [countries],
  );

  const round = rounds && index < rounds.length ? rounds[index] : null;

  // The spin: a quick whirl, then slam to a stop on the target.
  useEffect(() => {
    if (!round || phase !== "spinning") return;
    const t = setTimeout(() => setPhase("guessing"), 600 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [round, phase]);

  // The countdown. Runs off a wall-clock deadline (not an accumulated tick
  // count) so a throttled background tab can't hand out extra seconds. Running
  // out is a miss — same bookkeeping as a wrong click, just with no choice.
  useEffect(() => {
    if (phase !== "guessing" || !round) return;
    setTimeLeft(TIMER_SECONDS);
    const deadline = Date.now() + TIMER_SECONDS * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        setChoice(null);
        setPhase("revealed");
        setReaction(pickLine(TIMEOUT_LINES));
        setStreak(0);
        setHistory((h) => [...h, false]);
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, round]);

  const pick = (i: number) => {
    if (!round || phase !== "guessing") return;
    const correct = i === round.correctIndex;
    setChoice(i);
    setPhase("revealed");
    setReaction(pickLine(correct ? CORRECT_LINES : WRONG_LINES));
    setStreak((s) => (correct ? s + 1 : 0));
    setHistory((h) => [...h, correct]);
  };

  const next = () => {
    setChoice(null);
    setReaction("");
    setIndex((i) => i + 1);
    setPhase("spinning");
  };

  if (failed) {
    return (
      <main className="bg-hero min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted">Couldn&apos;t load the map data.</p>
        <Link href="/" className="text-gold underline">
          ← Home
        </Link>
      </main>
    );
  }

  // Shorts recording view: cold-open, auto-advancing, hands-free. Kept as a
  // wholly separate render path so the playable game above stays untouched.
  if (record) {
    if (!countries)
      return (
        <main className="flex h-screen w-full items-center justify-center bg-ink">
          <p className="animate-pulse text-muted">Loading the planet…</p>
        </main>
      );
    if (spin) return <SpinChallenge countries={countries} />;
    return <RecordMode countries={countries} interactive={interactive} />;
  }

  const answered = phase === "revealed";
  const timedOut = answered && choice === null;
  const gotItRight = answered && choice === round?.correctIndex;
  const finished = rounds != null && index >= rounds.length;

  // Highlight the target once it's found, and light up a wrong guess in red so
  // you can see where you actually pointed.
  const target = phase === "spinning" || !round ? null : round.target.properties;
  const wrongPick =
    answered && !gotItRight && choice != null ? round!.options[choice] : null;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-ink">
      <div className="absolute inset-0">
        {countries ? (
          <GlobeCanvas
            countries={countries}
            target={finished ? null : target}
            wrongPick={finished ? null : wrongPick}
            phase={finished ? "spinning" : phase}
            lightMode={light}
          />
        ) : null}
      </div>

      {/* Scrim: keeps text legible wherever the globe happens to be. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/85 via-transparent to-ink/95" />

      {!countries && !failed && (
        <Overlay>
          <p className="text-muted animate-pulse">Loading the planet…</p>
        </Overlay>
      )}

      {countries && !rounds && (
        <Setup onStart={start} light={light} onToggleLight={setLight} />
      )}

      {countries && rounds && !finished && round && (
        <>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5 text-sm text-muted">
            <Link href="/" className="hover:text-cream">
              ← Exit
            </Link>
            <span>
              Round {index + 1} of {rounds.length}
            </span>
            <Meter history={history} total={rounds.length} />
          </div>

          {/* The verdict bar docks to the bottom of the viewport, so the options
              have to get out of its way or it buries the second row. */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 p-5 transition-[padding] duration-300 ${
              answered ? "pb-32" : "pb-7"
            }`}
          >
            <div className="mx-auto w-full max-w-md">
              <AnimatePresence mode="wait">
                {phase === "spinning" ? (
                  <motion.p
                    key="spinning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pb-6 text-center text-lg font-black tracking-[0.2em] text-gold uppercase"
                  >
                    Spinning…
                  </motion.p>
                ) : (
                  <motion.div
                    key="guess"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  >
                    {!answered && <Countdown timeLeft={timeLeft} />}

                    <h1 className="mb-4 text-center text-xl font-black text-cream sm:text-2xl">
                      {answered
                        ? gotItRight
                          ? "Correct!"
                          : timedOut
                            ? "Time's up! 🫏"
                            : "Donkey Brains! 🫏"
                        : "Which country is highlighted?"}
                    </h1>

                    <div className="relative grid grid-cols-2 gap-3">
                      {answered &&
                        (gotItRight ? <Burst /> : <DonkeyRain />)}

                      {round.options.map((opt, i) => {
                        const isCorrect = i === round.correctIndex;
                        const isMine = i === choice;

                        let cls =
                          "bg-black/70 backdrop-blur text-white border border-white/15 hover:border-white/40";
                        if (answered) {
                          if (isCorrect)
                            cls =
                              "bg-emerald-600 text-white ring-4 ring-emerald-300 border border-transparent";
                          else if (isMine)
                            cls =
                              "bg-rose-600 text-white ring-4 ring-rose-300 border border-transparent";
                          else
                            cls =
                              "bg-black/50 backdrop-blur text-muted opacity-60 border border-transparent";
                        }

                        return (
                          <motion.button
                            key={opt.name}
                            onClick={() => pick(i)}
                            disabled={answered}
                            whileTap={answered ? undefined : { scale: 0.96 }}
                            animate={
                              answered && isCorrect
                                ? { scale: [1, 1.06, 1] }
                                : answered && isMine
                                  ? { x: [0, -8, 8, -6, 6, 0] }
                                  : {}
                            }
                            transition={{ duration: 0.4 }}
                            className={`min-h-16 rounded-2xl px-4 py-3 text-base font-bold leading-tight transition-colors ${cls}`}
                          >
                            {answered && (isCorrect || isMine) && (
                              <span className="mr-1.5">
                                {flagEmoji(opt.iso)}
                              </span>
                            )}
                            {opt.name}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    {reaction}
                  </div>
                  {gotItRight && STREAK_LINES[Math.min(streak, 5)] && (
                    <div className="text-sm font-black text-gold">
                      {STREAK_LINES[Math.min(streak, 5)]}
                    </div>
                  )}
                  {!gotItRight && (
                    <div className="truncate text-xs text-muted">
                      It was {flagEmoji(round.target.properties.iso)}{" "}
                      {round.target.properties.name}.
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
        </>
      )}

      {finished && rounds && (
        <Results
          history={history}
          onAgain={() => start(rounds.length)}
          onChangeLength={() => setRounds(null)}
        />
      )}
    </main>
  );
}

/** Settings toggle: stylized dark globe vs. realistic light Earth. */
function LightToggle({
  light,
  onToggle,
}: {
  light: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!light)}
      role="switch"
      aria-checked={light}
      className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold text-cream transition hover:bg-surface-2"
    >
      <span>🌍 Realistic Earth</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          light ? "bg-gold" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            light ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Setup({
  onStart,
  light,
  onToggleLight,
}: {
  onStart: (count: number) => void;
  light: boolean;
  onToggleLight: (v: boolean) => void;
}) {
  return (
    <Overlay>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-8"
      >
        <div className="text-center">
          <h1 className="wordmark text-5xl text-cream sm:text-6xl">
            Where in the
            <br />
            <span className="text-gold">World?</span>
          </h1>
          <p className="mt-4 max-w-xs text-sm text-muted">
            The globe spins. It stops on a country. Name it — or confirm, once
            and for all, that you have donkey brains. 🫏
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

        <LightToggle light={light} onToggle={onToggleLight} />

        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="text-sm text-muted hover:text-cream">
            ← Home
          </Link>
          <div className="flex gap-4">
            <Link
              href="/globe?record=1"
              className="text-xs text-muted/60 hover:text-muted"
            >
              🎬 Record · auto
            </Link>
            <Link
              href="/globe?record=me"
              className="text-xs text-muted/60 hover:text-muted"
            >
              🎬 Record · you answer
            </Link>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
}

function Results({
  history,
  onAgain,
  onChangeLength,
}: {
  history: boolean[];
  onAgain: () => void;
  onChangeLength: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const score = history.filter(Boolean).length;
  const total = history.length;
  const p = persona(score, total);
  const grid = history.map((c) => (c ? "🌍" : "🫏")).join(" ");
  const smart = total > 0 && score / total >= 0.6;

  const share = async () => {
    const text = `Where in the World? ${score}/${total}\n${grid}\n${p.title}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — no-op.
    }
  };

  return (
    <Overlay>
      <div className="relative">
        {smart ? <Burst big /> : <DonkeyRain big />}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
          className="text-center"
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
              {copied ? "Copied! Go humiliate a friend 📋" : "Share your score 🌍"}
            </motion.button>
            <button
              onClick={onChangeLength}
              className="block w-full pt-1 text-sm text-muted hover:text-cream"
            >
              Change round count
            </button>
            <Link
              href="/"
              className="block text-sm text-muted hover:text-cream"
            >
              Home
            </Link>
          </div>
        </motion.div>
      </div>
    </Overlay>
  );
}

/** Ticking clock for the current guess: a number over a draining bar. */
function Countdown({ timeLeft }: { timeLeft: number }) {
  const frac = Math.max(0, Math.min(1, timeLeft / TIMER_SECONDS));
  const secs = Math.max(0, Math.ceil(timeLeft));
  const urgent = timeLeft <= 2;
  return (
    <div className="mb-3 flex flex-col items-center gap-1.5">
      <motion.div
        key={secs}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={`text-3xl font-black tabular-nums ${
          urgent ? "text-rose-400" : "text-gold"
        }`}
      >
        {secs}
      </motion.div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
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

/** Globes vs. donkeys, filled in as you go. */
function Meter({ history, total }: { history: boolean[]; total: number }) {
  return (
    <span className="flex gap-1 text-sm" title="Your geography, so far">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          initial={i < history.length ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
          className={i >= history.length ? "opacity-25" : ""}
        >
          {i >= history.length ? "•" : history[i] ? "🌍" : "🫏"}
        </motion.span>
      ))}
    </span>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto p-6 text-center">
      {children}
    </div>
  );
}

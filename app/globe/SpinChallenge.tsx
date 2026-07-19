"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Burst, DonkeyRain } from "@/app/components/reactions";
import { Chip, Clock } from "@/app/components/record";
import {
  buildRoundInContinent,
  difficultyOf,
  flagEmoji,
  type CountryFeature,
  type Round,
} from "./countries";
import { useLightGlobe } from "./useLightGlobe";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

/** One big dramatic question — generous clock, since it's your only shot. */
const TIMER_SECONDS = 8;
const SPIN_MS = 3600;

// Wheel segments, in clockwise order. `name` must match the GeoJSON CONTINENT.
const WHEEL = [
  { name: "North America", label: "N. AMERICA", color: "#ef4444" },
  { name: "South America", label: "S. AMERICA", color: "#f97316" },
  { name: "Africa", label: "AFRICA", color: "#ffd21e" },
  { name: "Europe", label: "EUROPE", color: "#38bdf8" },
  { name: "Asia", label: "ASIA", color: "#a78bfa" },
  { name: "Oceania", label: "OCEANIA", color: "#10b981" },
];
const SEG = 360 / WHEEL.length;

type Stage = "ready" | "spinning" | "landed" | "guessing" | "revealed";

export default function SpinChallenge({
  countries,
}: {
  countries: CountryFeature[];
}) {
  const [light] = useLightGlobe();
  const [round, setRound] = useState<Round>(() =>
    buildRoundInContinent(countries, pickContinent()),
  );
  const [stage, setStage] = useState<Stage>("ready");
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [choice, setChoice] = useState<number | null>(null);

  const landedIndex = Math.max(
    0,
    WHEEL.findIndex((w) => w.name === round.target.properties.continent),
  );

  // Kick off a spin toward the continent this round's country lives in.
  const spinTo = (r: Round) => {
    const k = Math.max(
      0,
      WHEEL.findIndex((w) => w.name === r.target.properties.continent),
    );
    setRotation((prev) => {
      const base = (((-k * SEG) % 360) + 360) % 360; // puts segment k at the top
      const curMod = ((prev % 360) + 360) % 360;
      const delta = (base - curMod + 360) % 360;
      const jitter = (Math.random() - 0.5) * SEG * 0.5; // land off-center, still in-segment
      return prev + 5 * 360 + delta + jitter;
    });
    setStage("spinning");
  };

  // spin -> land -> hand off to the globe.
  useEffect(() => {
    if (stage !== "spinning") return;
    const t = setTimeout(() => setStage("landed"), SPIN_MS + 150);
    return () => clearTimeout(t);
  }, [stage]);
  useEffect(() => {
    if (stage !== "landed") return;
    const t = setTimeout(() => setStage("guessing"), 1300);
    return () => clearTimeout(t);
  }, [stage]);

  // The clock. Running out reveals the answer as a miss.
  useEffect(() => {
    if (stage !== "guessing") return;
    setTimeLeft(TIMER_SECONDS);
    const deadline = Date.now() + TIMER_SECONDS * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        setStage("revealed");
      }
    }, 50);
    return () => clearInterval(id);
  }, [stage]);

  const pick = (i: number) => {
    if (stage !== "guessing") return;
    setChoice(i);
    setStage("revealed");
  };

  const spinAgain = () => {
    const next = buildRoundInContinent(countries, pickContinent());
    setRound(next);
    setChoice(null);
    spinTo(next);
  };

  const t = round.target.properties;
  const correct = round.options[round.correctIndex];
  const gotIt = stage === "revealed" && choice === round.correctIndex;
  const onGlobe = stage === "guessing" || stage === "revealed";
  const target = onGlobe ? t : null;
  const wrongPick =
    stage === "revealed" && choice != null && choice !== round.correctIndex
      ? round.options[choice]
      : null;
  const difficulty = difficultyOf(t.pop);
  const wheelStage = stage === "ready" || stage === "spinning" || stage === "landed";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-ink">
      <div
        className={`absolute inset-0 transition-transform duration-500 ${
          onGlobe ? "-translate-y-[16%]" : ""
        }`}
      >
        <GlobeCanvas
          countries={countries}
          target={target}
          wrongPick={wrongPick}
          phase={onGlobe ? (stage as "guessing" | "revealed") : "spinning"}
          spinSpeed={3}
          revealZoomOut
          lightMode={light}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,13,0.4)_0%,transparent_28%,rgba(13,13,13,0.4)_60%,rgba(13,13,13,0.95)_82%,#0d0d0d_100%)]" />

      {/* --- Wheel screen (ready / spinning / landed) --- */}
      {wheelStage && (
        <div className="bg-hero absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
          <div className="absolute inset-x-0 top-0 flex justify-center pt-8 text-sm font-black">
            <span className="text-gold">🎡 SPIN THE WHEEL</span>
          </div>

          <Wheel
            rotation={rotation}
            spinning={stage === "spinning"}
            onSpin={stage === "ready" ? () => spinTo(round) : undefined}
          />

          <div className="mt-8 flex h-28 flex-col items-center justify-start">
            <AnimatePresence mode="wait">
              {stage === "ready" && (
                <motion.button
                  key="spin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, scale: [1, 1.05, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{
                    scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
                  }}
                  onClick={() => spinTo(round)}
                  className="rounded-full bg-gold px-14 py-5 text-3xl font-black text-ink shadow-[0_0_60px_-8px] shadow-gold/70 transition hover:bg-gold-bright"
                >
                  SPIN
                </motion.button>
              )}
              {stage === "spinning" && (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-2xl font-black uppercase tracking-[0.25em] text-muted"
                >
                  Spinning…
                </motion.div>
              )}
              {stage === "landed" && (
                <motion.div
                  key="landed"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 14 }}
                  className="text-center"
                >
                  <div className="text-sm font-black uppercase tracking-[0.2em] text-muted">
                    It landed on
                  </div>
                  <div
                    className="text-4xl font-black"
                    style={{ color: WHEEL[landedIndex].color }}
                  >
                    {WHEEL[landedIndex].label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* --- Guess (globe) --- */}
      {stage === "guessing" && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-32">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-3 flex justify-center">
              <Chip label={difficulty.label} color={difficulty.color} />
            </div>
            <h1 className="mb-4 text-center text-3xl font-black text-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl">
              Name this country
            </h1>
            <div className="mb-5 flex justify-center">
              <Clock timeLeft={timeLeft} total={TIMER_SECONDS} big />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {round.options.map((opt, i) => (
                <motion.button
                  key={opt.name}
                  onClick={() => pick(i)}
                  whileTap={{ scale: 0.96 }}
                  className="flex min-h-16 items-center justify-center rounded-2xl border border-white/15 bg-black/70 px-4 py-3 text-center text-base font-bold leading-tight text-white backdrop-blur transition-colors hover:border-white/40"
                >
                  {opt.name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Dramatic result --- */}
      {stage === "revealed" && (
        <Result
          gotIt={gotIt}
          correct={correct.name}
          correctIso={correct.iso}
          picked={choice != null ? round.options[choice] : null}
          onSpinAgain={spinAgain}
        />
      )}
    </main>
  );
}

function pickContinent(): string {
  return WHEEL[Math.floor(Math.random() * WHEEL.length)].name;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Wheel({
  rotation,
  spinning,
  onSpin,
}: {
  rotation: number;
  spinning: boolean;
  onSpin?: () => void;
}) {
  const size = 300;
  const r = size / 2;
  const cx = r;
  const cy = r;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onClick={onSpin}
      role={onSpin ? "button" : undefined}
    >
      {/* Pointer — fixed at the top, pointing down into the wheel. */}
      <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
      </div>

      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        animate={{ rotate: rotation }}
        transition={
          spinning
            ? { duration: SPIN_MS / 1000, ease: [0.16, 0.75, 0.2, 1] }
            : { duration: 0 }
        }
        style={{ transformOrigin: "center" }}
      >
        <circle cx={cx} cy={cy} r={r - 2} fill="#0d0d0d" />
        {WHEEL.map((w, i) => {
          const a0 = -90 - SEG / 2 + i * SEG;
          const a1 = -90 + SEG / 2 + i * SEG;
          const p0 = polar(cx, cy, r - 6, a0);
          const p1 = polar(cx, cy, r - 6, a1);
          const mid = polar(cx, cy, (r - 6) * 0.62, -90 + i * SEG);
          return (
            <g key={w.name}>
              <path
                d={`M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r - 6} ${r - 6} 0 0 1 ${p1.x} ${p1.y} Z`}
                fill={w.color}
                stroke="#0d0d0d"
                strokeWidth={3}
              />
              <text
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={900}
                fill="#fff"
                stroke="#0d0d0d"
                strokeWidth={0.8}
                paintOrder="stroke"
                style={{ letterSpacing: "0.02em" }}
              >
                {w.label}
              </text>
            </g>
          );
        })}
        {/* Rim bulbs. */}
        {Array.from({ length: 24 }).map((_, i) => {
          const p = polar(cx, cy, r - 8, i * (360 / 24));
          return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#ffd21e" />;
        })}
        {/* Hub. */}
        <circle cx={cx} cy={cy} r={26} fill="#0d0d0d" stroke="#ffd21e" strokeWidth={3} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
        >
          🌍
        </text>
      </motion.svg>
    </div>
  );
}

function Result({
  gotIt,
  correct,
  correctIso,
  picked,
  onSpinAgain,
}: {
  gotIt: boolean;
  correct: string;
  correctIso: string | null;
  picked: { name: string; iso: string | null } | null;
  onSpinAgain: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-24">
      <div className="relative mx-auto w-full max-w-md text-center">
        {gotIt ? <Burst big /> : <DonkeyRain big />}

        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className={`text-6xl font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
            gotIt ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {gotIt ? "CORRECT!" : "WRONG!"} {gotIt ? "🎉" : "🫏"}
        </motion.div>

        {!gotIt && picked && (
          <div className="mt-3 text-lg font-bold text-muted">
            You said {flagEmoji(picked.iso)} {picked.name}
          </div>
        )}

        <div className="mt-2 text-3xl font-black text-cream">
          It was {flagEmoji(correctIso)} {correct}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <motion.button
            onClick={onSpinAgain}
            whileTap={{ scale: 0.95 }}
            className="w-full max-w-xs rounded-full bg-gold px-8 py-4 text-lg font-black text-ink transition hover:bg-gold-bright"
          >
            Spin again 🔁
          </motion.button>
          <div className="text-base font-black text-gold">
            Can you get it? Comment 👇
          </div>
          <Link href="/globe" className="text-sm text-muted hover:text-cream">
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}

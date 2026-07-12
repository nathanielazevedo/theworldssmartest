"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { answerStyle } from "@/app/lib/answerStyles";

type Session = { playerId: Id<"players">; gameId: Id<"games"> };

// Convex sends ConvexError.data to the client in production (plain Error
// messages are hidden there), so read that first for a human message.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) return String(err.data);
  return err instanceof Error ? err.message : fallback;
}

export default function PlayPage() {
  const [session, setSession] = useState<Session | null>(null);

  // Restore an in-progress session on refresh.
  useEffect(() => {
    const raw = localStorage.getItem("triviaSession");
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        localStorage.removeItem("triviaSession");
      }
    }
  }, []);

  const start = (s: Session) => {
    localStorage.setItem("triviaSession", JSON.stringify(s));
    setSession(s);
  };
  const leave = () => {
    localStorage.removeItem("triviaSession");
    setSession(null);
  };

  if (!session) return <JoinForm onJoined={start} />;
  return <GameScreen session={session} onLeave={leave} />;
}

function JoinForm({ onJoined }: { onJoined: (s: Session) => void }) {
  const join = useMutation(api.players.join);
  const game = useQuery(api.games.current);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const noGame = game === null || game?.status === "ended";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await join({ name: name.trim() });
      onJoined(res);
    } catch (err) {
      setError(errorMessage(err, "Could not join"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bg-hero min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="wordmark text-cream text-2xl text-center mb-1">
        The Search for the <span className="text-gold">World&apos;s Smartest</span> Person
      </h1>
      <p className="text-muted text-sm mb-10">Enter to compete</p>

      {noGame ? (
        <p className="text-muted text-center animate-pulse">
          No game is running right now.
          <br />
          Hang tight — it&apos;ll appear the moment the host starts one.
        </p>
      ) : (
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            className="w-full rounded-2xl bg-surface border border-line px-5 py-4 text-center text-xl placeholder:text-muted/50 outline-none focus:ring-2 ring-gold"
          />
          {error && <p className="text-rose-400 text-center text-sm">{error}</p>}
          <button
            disabled={busy || !name}
            className="w-full rounded-full bg-gold enabled:hover:bg-gold-bright text-ink disabled:opacity-40 px-6 py-4 text-xl font-black transition"
          >
            {busy ? "Joining…" : "Join the Game"}
          </button>
        </form>
      )}
    </main>
  );
}

function GameScreen({
  session,
  onLeave,
}: {
  session: Session;
  onLeave: () => void;
}) {
  const state = useQuery(api.games.current);
  const me = useQuery(api.players.me, { playerId: session.playerId });
  const submit = useMutation(api.answers.submit);
  const counts = useQuery(
    api.answers.liveCounts,
    state?.question
      ? {
          gameId: state._id,
          questionId: state.question._id,
          playerId: session.playerId,
        }
      : "skip",
  );
  const leaderboard = useQuery(api.players.leaderboard, {
    gameId: session.gameId,
  });

  const [error, setError] = useState<string | null>(null);

  if (state === undefined) return <main className="p-6 text-muted">Loading…</main>;

  // A brand-new game replaced the one this player joined — send them to rejoin.
  if (state === null || state._id !== session.gameId) {
    return (
      <Centered>
        <p className="text-muted">A new game has started.</p>
        <button
          onClick={onLeave}
          className="mt-4 rounded-full bg-gold hover:bg-gold-bright text-ink px-6 py-3 font-black"
        >
          Join it
        </button>
      </Centered>
    );
  }

  const myChoice = counts?.myChoice ?? null;

  const pick = async (i: number) => {
    if (!state.question || myChoice !== null) return;
    setError(null);
    try {
      await submit({
        playerId: session.playerId,
        questionId: state.question._id,
        choiceIndex: i,
      });
    } catch (err) {
      setError(errorMessage(err, "Could not submit"));
    }
  };

  // ---- render by game status ----
  if (state.status === "lobby") {
    return (
      <Centered>
        <div className="text-muted">You&apos;re in!</div>
        <div className="text-3xl font-black mt-1 text-cream">{me?.name}</div>
        <div className="mt-6 animate-pulse text-muted">
          Waiting for the host to start…
        </div>
      </Centered>
    );
  }

  if (state.status === "ended") {
    return (
      <Centered>
        <div className="text-muted">Final score</div>
        <div className="text-6xl font-black mt-1 text-gold">{me?.score ?? 0}</div>
        <div className="mt-2 text-xl text-cream">
          Rank #{me?.rank} of {me?.totalPlayers}
        </div>
        <button onClick={onLeave} className="mt-8 underline text-muted">
          Leave game
        </button>
      </Centered>
    );
  }

  if (state.status === "leaderboard" || state.status === "reveal") {
    return (
      <ResultsScreen
        question={state.question}
        counts={counts}
        score={me?.score ?? 0}
        rank={me?.rank}
        totalPlayers={me?.totalPlayers}
        leaderboard={leaderboard ?? []}
      />
    );
  }

  // status === "question"
  return (
    <QuestionPlay
      name={me?.name}
      score={me?.score ?? 0}
      question={state.question!}
      questionStartedAt={state.questionStartedAt}
      myChoice={myChoice}
      onPick={pick}
      error={error}
    />
  );
}

function QuestionPlay({
  name,
  score,
  question,
  questionStartedAt,
  myChoice,
  onPick,
  error,
}: {
  name?: string;
  score: number;
  question: { text: string; options: string[]; timeLimitSec: number };
  questionStartedAt: number | null;
  myChoice: number | null;
  onPick: (i: number) => void;
  error: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const remaining = questionStartedAt
    ? Math.max(
        0,
        Math.ceil((questionStartedAt + question.timeLimitSec * 1000 - now) / 1000),
      )
    : question.timeLimitSec;
  const timeUp = remaining <= 0;
  const locked = myChoice !== null || timeUp;

  return (
    <main className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{name}</span>
        <span className="text-gold font-bold">{score} pts</span>
      </div>

      {/* Countdown so nobody taps after time expires. */}
      <div
        className={`mx-auto mt-3 flex size-12 items-center justify-center rounded-full text-xl font-black ${
          remaining <= 5 && !locked ? "bg-rose-600 text-white" : "bg-surface text-gold"
        }`}
      >
        {remaining}
      </div>

      <div className="mt-4 mb-6 text-center text-xl font-bold text-cream">
        {question.text}
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {question.options.map((opt, i) => {
          const s = answerStyle(i);
          const chosen = myChoice === i;
          const dim = locked && !chosen;
          return (
            <motion.button
              key={i}
              onClick={() => onPick(i)}
              disabled={locked}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: dim ? 0.3 : 1,
                scale: chosen ? 1.03 : 1,
              }}
              transition={{
                delay: i * 0.05,
                scale: { type: "spring", stiffness: 400, damping: 15 },
              }}
              whileTap={{ scale: 0.94 }}
              className={`rounded-2xl ${s.bg} ${
                chosen ? "ring-4 " + s.ring : ""
              } p-4 flex flex-col items-center justify-center gap-2 text-center text-white`}
            >
              <span className="text-3xl">{s.shape}</span>
              <span className="font-bold">{opt}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 text-center text-sm text-muted h-6">
        {error ? (
          <span className="text-rose-400">{error}</span>
        ) : myChoice !== null ? (
          "Locked in — waiting for results…"
        ) : timeUp ? (
          <span className="text-rose-400">Time&apos;s up!</span>
        ) : (
          "Tap your answer!"
        )}
      </div>
    </main>
  );
}

function ResultsScreen({
  question,
  counts,
  score,
  rank,
  totalPlayers,
  leaderboard,
}: {
  question: { text: string; options: string[]; correctIndex: number | null } | null;
  counts:
    | {
        total: number;
        counts: Record<number, number>;
        myChoice: number | null;
        myCorrect: boolean;
        myPoints: number;
      }
    | undefined;
  score: number;
  rank?: number;
  totalPlayers?: number;
  leaderboard: { _id: string; name: string; score: number; rank: number }[];
}) {
  const answered = counts?.myChoice != null;
  const correct = counts?.myCorrect ?? false;
  const total = counts?.total ?? 0;

  return (
    <main className="min-h-screen flex flex-col items-center p-4 gap-4 overflow-y-auto">
      {/* Own result */}
      <motion.div
        className="mt-2 text-center"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        {!answered ? (
          <div className="text-3xl font-black text-muted">⏱️ No answer</div>
        ) : correct ? (
          <>
            <div className="text-4xl font-black text-emerald-400">Correct! ✅</div>
            <motion.div
              className="text-2xl font-black text-gold mt-1"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              +{(counts?.myPoints ?? 0).toLocaleString()}
            </motion.div>
          </>
        ) : (
          <div className="text-4xl font-black text-rose-400">Wrong ❌</div>
        )}
      </motion.div>

      {/* Correct answer + crowd breakdown */}
      {question && (
        <div className="w-full max-w-sm">
          <div className="text-center text-sm text-muted mb-3">{question.text}</div>
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const s = answerStyle(i);
              const n = counts?.counts[i] ?? 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              const isCorrect = question.correctIndex === i;
              const isMine = counts?.myChoice === i;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-lg border ${
                    isCorrect ? "border-gold" : "border-line/40"
                  } ${!isCorrect ? "opacity-60" : ""}`}
                >
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${s.bg} opacity-30`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                  />
                  <div className="relative flex items-center justify-between px-3 py-2 text-cream">
                    <span className="flex items-center gap-2">
                      <span>{s.shape}</span>
                      {opt}
                      {isCorrect && <span className="text-gold">✓</span>}
                      {isMine && <span className="text-xs text-muted">(you)</span>}
                    </span>
                    <span className="text-muted text-sm">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Your standing */}
      <div className="text-center">
        <div className="text-muted text-sm">Your score</div>
        <div className="text-4xl font-black text-gold">{score.toLocaleString()}</div>
        {rank != null && (
          <div className="text-cream">
            Rank #{rank} of {totalPlayers}
          </div>
        )}
      </div>

      {/* Top standings */}
      {leaderboard.length > 0 && (
        <div className="w-full max-w-sm">
          <div className="text-center text-sm text-muted mb-2">Leaderboard</div>
          <div className="space-y-1.5">
            {leaderboard.slice(0, 5).map((p) => (
              <div
                key={p._id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${
                  p.rank === 1
                    ? "bg-gold text-ink"
                    : "bg-surface text-cream border border-line/50"
                }`}
              >
                <span>
                  <span className="opacity-60 mr-2">#{p.rank}</span>
                  {p.name}
                </span>
                <span className="font-mono">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-hero min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

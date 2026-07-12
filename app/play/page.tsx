"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { answerStyle } from "@/app/lib/answerStyles";

type Session = { playerId: Id<"players">; gameId: Id<"games"> };

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
      setError(err instanceof Error ? err.message : "Could not join");
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
      setError(err instanceof Error ? err.message : "Could not submit");
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
    const gotItRight =
      myChoice !== null &&
      state.question?.correctIndex === myChoice &&
      state.status === "reveal";
    return (
      <Centered>
        {state.status === "reveal" ? (
          myChoice === null ? (
            <div className="text-2xl text-muted">⏱️ No answer</div>
          ) : gotItRight ? (
            <div className="text-4xl font-black text-emerald-400">Correct! ✅</div>
          ) : (
            <div className="text-4xl font-black text-rose-400">Wrong ❌</div>
          )
        ) : (
          <div className="text-2xl font-bold text-cream">Standings</div>
        )}
        <div className="mt-6 text-muted">Score</div>
        <div className="text-5xl font-black text-gold">{me?.score ?? 0}</div>
        <div className="mt-1 text-lg text-cream">
          Rank #{me?.rank} of {me?.totalPlayers}
        </div>
      </Centered>
    );
  }

  // status === "question"
  return (
    <main className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{me?.name}</span>
        <span className="text-gold font-bold">{me?.score ?? 0} pts</span>
      </div>

      <div className="mt-4 mb-6 text-center text-xl font-bold text-cream">
        {state.question?.text}
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {state.question?.options.map((opt, i) => {
          const s = answerStyle(i);
          const chosen = myChoice === i;
          const dim = myChoice !== null && !chosen;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={myChoice !== null}
              className={`rounded-2xl ${s.bg} ${
                dim ? "opacity-30" : ""
              } ${chosen ? "ring-4 " + s.ring : ""} p-4 flex flex-col items-center justify-center gap-2 text-center text-white transition`}
            >
              <span className="text-3xl">{s.shape}</span>
              <span className="font-bold">{opt}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-center text-sm text-muted h-6">
        {error ? (
          <span className="text-rose-400">{error}</span>
        ) : myChoice !== null ? (
          "Locked in — waiting for others…"
        ) : (
          "Tap your answer!"
        )}
      </div>
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

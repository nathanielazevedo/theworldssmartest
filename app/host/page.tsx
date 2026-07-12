"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

function useHostId() {
  const [hostId, setHostId] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem("triviaHostId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("triviaHostId", id);
    }
    setHostId(id);
  }, []);
  return hostId;
}

// Simple host gate. NOTE: this is a client-side password so it only keeps
// casual visitors out — the value ships in the browser bundle. For real
// protection, move the check to a Convex function backed by an env var.
const HOST_PASSWORD = "dogparty";
const HOST_AUTH_KEY = "triviaHostAuth";

export default function HostPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking

  useEffect(() => {
    setAuthed(localStorage.getItem(HOST_AUTH_KEY) === HOST_PASSWORD);
  }, []);

  if (authed === null) return null; // avoid a flash before we've checked storage

  if (!authed) {
    return (
      <PasswordGate
        onUnlock={() => {
          localStorage.setItem(HOST_AUTH_KEY, HOST_PASSWORD);
          setAuthed(true);
        }}
      />
    );
  }

  return <HostConsole />;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === HOST_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <main className="bg-hero min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="wordmark text-cream text-2xl mb-1">Host Access</h1>
      <p className="text-muted text-sm mb-8">Enter the host password to continue</p>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className="w-full rounded-2xl bg-surface border border-line px-5 py-4 text-center text-xl placeholder:text-muted/50 outline-none focus:ring-2 ring-gold"
        />
        {error && (
          <p className="text-rose-400 text-center text-sm">Incorrect password</p>
        )}
        <button
          disabled={!value}
          className="w-full rounded-full bg-gold enabled:hover:bg-gold-bright text-ink disabled:opacity-40 px-6 py-4 text-xl font-black transition"
        >
          Unlock
        </button>
      </form>
      <Link href="/" className="text-muted/60 hover:text-muted text-xs mt-8">
        ← Home
      </Link>
    </main>
  );
}

function HostConsole() {
  const current = useQuery(api.games.current);
  const [showSetup, setShowSetup] = useState(false);

  if (current === undefined) return <main className="p-6">Loading…</main>;

  // No game yet, or the host chose to start a fresh one.
  if (!current || showSetup) {
    return <Setup onCreated={() => setShowSetup(false)} />;
  }

  return <RunningGame onNewGame={() => setShowSetup(true)} />;
}

function Setup({ onCreated }: { onCreated: () => void }) {
  const hostId = useHostId();
  const questions = useQuery(api.questions.listApproved);
  const seed = useMutation(api.seed.sample);
  const createGame = useMutation(api.games.create);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onCreate = async () => {
    if (!hostId || selected.size === 0) return;
    await createGame({
      hostId,
      questionIds: [...selected] as Id<"questionBank">[],
    });
    onCreated();
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-black">New Game</h1>
        <Link href="/" className="text-white/50 hover:text-white text-sm">
          ← Home
        </Link>
      </header>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">
            Question Bank{" "}
            <span className="text-white/40 font-normal">
              ({questions?.length ?? 0})
            </span>
          </h2>
          {questions !== undefined && questions.length === 0 && (
            <button
              onClick={() => seed()}
              className="rounded-lg bg-gold hover:bg-gold-bright text-ink px-4 py-2 text-sm font-semibold"
            >
              Load sample questions
            </button>
          )}
        </div>

        <div className="space-y-2">
          {questions?.map((q) => (
            <label
              key={q._id}
              className="flex items-start gap-3 rounded-xl bg-surface hover:bg-surface-2 p-4 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(q._id)}
                onChange={() => toggle(q._id)}
                className="mt-1 size-5"
              />
              <div>
                <div className="font-semibold">{q.text}</div>
                <div className="text-sm text-white/50">
                  {q.category} · {q.difficulty} · {q.timeLimitSec}s · answer:{" "}
                  {q.options[q.correctIndex]}
                </div>
              </div>
            </label>
          ))}
          {questions?.length === 0 && (
            <p className="text-white/40">
              No questions yet — load the sample set to get started.
            </p>
          )}
        </div>
      </section>

      <div className="sticky bottom-4 mt-8">
        <button
          disabled={selected.size === 0}
          onClick={onCreate}
          className="w-full rounded-2xl bg-gold enabled:hover:bg-gold-bright text-ink disabled:opacity-40 px-6 py-4 text-lg font-bold transition"
        >
          Start game with {selected.size} question
          {selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </main>
  );
}

function RunningGame({ onNewGame }: { onNewGame: () => void }) {
  const state = useQuery(api.games.current);
  const advance = useMutation(api.games.advance);
  const reveal = useMutation(api.games.reveal);
  const showLeaderboard = useMutation(api.games.showLeaderboard);
  const leaderboard = useQuery(
    api.players.leaderboard,
    state ? { gameId: state._id } : "skip",
  );
  const counts = useQuery(
    api.answers.liveCounts,
    state?.question ? { gameId: state._id, questionId: state.question._id } : "skip",
  );

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  if (!state) return <main className="p-6">Loading…</main>;

  const gameId = state._id;
  const atEnd = state.status === "ended";

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Host Panel</h1>
        <div className="text-right text-sm">
          <div className="text-white/50">Status</div>
          <div className="font-bold uppercase">{state.status}</div>
          <div className="text-white/50 mt-1">
            {state.currentIndex >= 0
              ? `Q${state.currentIndex + 1} / ${state.totalQuestions}`
              : `${state.totalQuestions} questions`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/broadcast"
          target="_blank"
          className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 font-semibold"
        >
          Open broadcast view ↗
        </Link>
        <span className="rounded-lg bg-surface px-4 py-2 text-white/60">
          Players join at {origin}/play
        </span>
        <button
          onClick={onNewGame}
          className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 font-semibold"
        >
          New game
        </button>
      </div>

      {state.question && (
        <div className="mt-6 rounded-2xl bg-surface p-5">
          <div className="font-bold text-lg">{state.question.text}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {state.question.options.map((opt, i) => {
              const isAnswer = state.question!.correctIndex === i;
              return (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isAnswer ? "bg-gold/25 text-cream" : "bg-surface"
                  }`}
                >
                  {opt}
                  {counts && (
                    <span className="text-white/50"> · {counts.counts[i] ?? 0}</span>
                  )}
                </div>
              );
            })}
          </div>
          {counts && (
            <div className="mt-2 text-sm text-white/50">
              {counts.total} answer{counts.total === 1 ? "" : "s"} in
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => advance({ gameId })}
          disabled={atEnd}
          className="rounded-xl bg-gold enabled:hover:bg-gold-bright text-ink disabled:opacity-40 px-4 py-4 font-bold"
        >
          {state.currentIndex < 0 ? "Start ▶" : "Next question ▶"}
        </button>
        <button
          onClick={() => reveal({ gameId })}
          disabled={state.status !== "question"}
          className="rounded-xl bg-amber-500 enabled:hover:bg-amber-400 disabled:opacity-40 px-4 py-4 font-bold text-black"
        >
          Reveal answer
        </button>
        <button
          onClick={() => showLeaderboard({ gameId })}
          disabled={atEnd || state.currentIndex < 0}
          className="rounded-xl bg-surface-2 enabled:hover:bg-line disabled:opacity-40 px-4 py-4 font-bold"
        >
          Show leaderboard
        </button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold mb-2">Leaderboard</h2>
        <div className="space-y-1">
          {leaderboard?.map((p) => (
            <div
              key={p._id}
              className="flex items-center justify-between rounded-lg bg-surface px-4 py-2"
            >
              <span>
                <span className="text-white/40 mr-2">#{p.rank}</span>
                {p.name}
              </span>
              <span className="font-mono font-bold">{p.score}</span>
            </div>
          ))}
          {leaderboard?.length === 0 && (
            <p className="text-white/40">No players yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}

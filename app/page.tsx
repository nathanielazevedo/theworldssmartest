"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const game = useQuery(api.games.current);
  const archive = useQuery(api.streams.archive);
  const live = game != null && game.status !== "ended";
  const starting = live && game!.status === "lobby";

  return (
    <main className="bg-hero min-h-screen flex flex-col items-center">
      {/* Hero — first viewport */}
      <section className="min-h-screen w-full flex flex-col items-center justify-center gap-10 p-6">
        <h1 className="wordmark text-cream text-5xl sm:text-6xl text-center">
          The Search for the
          <br />
          <span className="text-gold">World&apos;s Smartest</span>
          <br />
          Person
        </h1>

        <StatusPill game={game} live={live} starting={starting} />

        <Link
          href="/play"
          className="w-full max-w-sm rounded-full bg-gold hover:bg-gold-bright text-ink text-2xl font-black py-5 text-center transition shadow-[0_0_50px_-8px] shadow-gold/50"
        >
          {live ? "Join the Game" : "Enter"}
        </Link>

        <p className="text-muted text-sm max-w-xs text-center">
          Answer fastest, climb the leaderboard, and prove you&apos;re the
          smartest in the room.
        </p>

        {archive && archive.length > 0 && (
          <a href="#archive" className="text-muted/60 hover:text-muted text-sm">
            ↓ Past streams
          </a>
        )}
      </section>

      {/* Archive */}
      {archive && archive.length > 0 && (
        <section id="archive" className="w-full max-w-2xl px-6 pb-20">
          <h2 className="wordmark text-cream text-2xl mb-6">Past Streams</h2>
          <div className="space-y-3">
            {archive.map((s) => (
              <Link
                key={s.gameId}
                href={`/stream/${s.gameId}`}
                className="block rounded-2xl bg-surface hover:bg-surface-2 border border-line/50 p-5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xl font-black text-cream">{s.title}</div>
                  <div className="text-muted text-sm">
                    {new Date(s.airedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{s.questionCount} questions</span>
                  <span>{s.playerCount} players</span>
                  {s.winner && (
                    <span className="text-gold font-semibold">
                      🏆 {s.winner.name} · {s.winner.score.toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link href="/host" className="text-muted/50 hover:text-muted text-xs pb-6">
        Host panel
      </Link>
    </main>
  );
}

function StatusPill({
  game,
  live,
  starting,
}: {
  game: ReturnType<typeof useQuery<typeof api.games.current>>;
  live: boolean;
  starting: boolean;
}) {
  if (game === undefined) {
    return <div className="h-9" />;
  }

  if (!live) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 text-muted">
        <span className="size-2.5 rounded-full bg-muted/60" />
        Next game coming soon
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-gold/15 border border-gold/40 px-5 py-2 text-gold font-bold">
      <span className="live-dot size-2.5 rounded-full bg-gold" />
      {starting ? "Starting now — get in!" : "Live now"}
    </div>
  );
}

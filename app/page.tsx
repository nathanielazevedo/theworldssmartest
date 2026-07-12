"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const game = useQuery(api.games.current);
  const live = game != null && game.status !== "ended";
  const starting = live && game!.status === "lobby";

  return (
    <main className="bg-hero min-h-screen flex flex-col items-center justify-between p-6">
      <div className="h-8" />

      <div className="flex flex-col items-center text-center gap-10 max-w-3xl">
        {/* Wordmark */}
        <h1 className="wordmark text-cream text-5xl sm:text-6xl">
          The Search for the
          <br />
          <span className="text-gold">World&apos;s Smartest</span>
          <br />
          Person
        </h1>

        {/* Live status */}
        <StatusPill game={game} live={live} starting={starting} />

        {/* The one thing to do */}
        <Link
          href="/play"
          className="w-full max-w-sm rounded-full bg-gold hover:bg-gold-bright text-ink text-2xl font-black py-5 text-center transition shadow-[0_0_50px_-8px] shadow-gold/50"
        >
          {live ? "Join the Game" : "Enter"}
        </Link>

        <p className="text-muted text-sm max-w-xs">
          Answer fastest, climb the leaderboard, and prove you&apos;re the
          smartest in the room.
        </p>
      </div>

      {/* Tiny host entry — most users ignore this */}
      <Link href="/host" className="text-muted/60 hover:text-muted text-xs">
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
    return <div className="h-9" />; // reserve space while loading
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

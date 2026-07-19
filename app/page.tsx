"use client";

import Link from "next/link";
import { motion } from "framer-motion";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

export default function Home() {
  // const game = useQuery(api.games.current);
  // const archive = useQuery(api.streams.archive);
  // const live = game != null && game.status !== "ended";
  // const starting = live && game!.status === "lobby";

  return (
    <main className="bg-hero min-h-screen flex flex-col items-center">
      {/* Hero — first viewport */}
      <section className="min-h-screen w-full flex flex-col items-center justify-center gap-10 p-6">
        <motion.img
          src="/logo.png"
          alt="Do You Have Donkey Brains?"
          className="w-72 sm:w-96 max-w-[85vw] drop-shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        />

        {/* <StatusPill game={game} live={live} starting={starting} /> */}

        {/* <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 18 }}
        >
          <Link
            href="/play"
            className="block w-full rounded-full bg-gold hover:bg-gold-bright text-ink text-2xl font-black py-5 text-center transition shadow-[0_0_50px_-8px] shadow-gold/50"
          >
            {live ? "Join the Game" : "Enter"}
          </Link>
        </motion.div> */}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm"
        >
          <Link
            href="/practice"
            className="flex items-center justify-center gap-3 w-full rounded-full bg-gold hover:bg-gold-bright text-ink text-xl font-black py-5 text-center transition shadow-[0_0_50px_-8px] shadow-gold/60"
          >
            Begin Cognitive Evaluation
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm -mt-4"
        >
          <Link
            href="/globe"
            className="flex items-center justify-center gap-3 w-full rounded-full bg-surface hover:bg-surface-2 border border-line text-cream text-xl font-black py-5 text-center transition"
          >
            🌍 Where in the World?
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 260, damping: 18 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm -mt-4"
        >
          <Link
            href="/language"
            className="flex items-center justify-center gap-3 w-full rounded-full bg-surface hover:bg-surface-2 border border-line text-cream text-xl font-black py-5 text-center transition"
          >
            🗣️ What Language?
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 18 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm -mt-4"
        >
          <Link
            href="/higher"
            className="flex items-center justify-center gap-3 w-full rounded-full bg-surface hover:bg-surface-2 border border-line text-cream text-xl font-black py-5 text-center transition"
          >
            👥 Higher or Lower?
          </Link>
        </motion.div>

        <p className="text-muted text-sm max-w-xs text-center">
          Answer fast, dodge the dumb mistakes, and prove you don&apos;t have
          donkey brains. 🫏
        </p>

        {/* Cold-open, auto-advancing views built for recording vertical Shorts.
            "auto" plays itself; "you" makes you tap the answers on camera. */}
        <div className="mt-2 flex flex-col items-center gap-1 text-xs text-muted/50">
          <span className="uppercase tracking-[0.2em]">🎬 Record for Shorts</span>
          <div className="flex gap-3">
            <Link href="/globe?record=1" className="hover:text-muted">
              Globe · auto
            </Link>
            <Link href="/globe?record=me" className="hover:text-muted">
              Globe · you
            </Link>
            <Link href="/globe?record=spin" className="hover:text-muted">
              Globe · spin
            </Link>
            <Link href="/practice?record=1" className="hover:text-muted">
              Trivia · auto
            </Link>
            <Link href="/practice?record=me" className="hover:text-muted">
              Trivia · you
            </Link>
            <Link href="/higher?record=me" className="hover:text-muted">
              Higher/Lower · you
            </Link>
          </div>
        </div>

        {/* {archive && archive.length > 0 && (
          <a href="#archive" className="text-muted/60 hover:text-muted text-sm">
            ↓ Past streams
          </a>
        )} */}
      </section>

      {/* Archive — hidden while in solo mode
      {archive && archive.length > 0 && (
        <section id="archive" className="w-full max-w-2xl px-6 pb-20">
          <h2 className="wordmark text-cream text-2xl mb-6">Past Streams</h2>
          <div className="space-y-3">
            {archive.map((s, i) => (
              <motion.div
                key={s.gameId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
              >
                <Link
                  href={`/stream/${s.gameId}`}
                  className="block rounded-2xl bg-surface hover:bg-surface-2 border border-line/50 p-5 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-black text-cream">
                      {s.title}
                    </div>
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
              </motion.div>
            ))}
          </div>
        </section>
      )}
      */}

      {/* <Link
        href="/host"
        className="text-muted/50 hover:text-muted text-xs pb-6"
      >
        Host panel
      </Link> */}
    </main>
  );
}

/* function StatusPill({
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
    <div className="flex items-center gap-2 rounded-full bg-red/15 border border-red/50 px-5 py-2 text-red-bright font-bold">
      <span className="live-dot size-2.5 rounded-full bg-red" />
      {starting ? "Starting now — get in!" : "🔴 Live now"}
    </div>
  );
} */

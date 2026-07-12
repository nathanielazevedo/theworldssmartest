"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { answerStyle } from "@/app/lib/answerStyles";

export default function StreamDetailPage() {
  const params = useParams<{ gameId: string }>();
  const data = useQuery(api.streams.detail, {
    gameId: params.gameId as Id<"games">,
  });

  if (data === undefined) {
    return <main className="p-6 text-muted">Loading…</main>;
  }
  if (data === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted">That stream doesn&apos;t exist.</p>
        <Link href="/" className="text-gold underline">
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <Link href="/" className="text-muted/70 hover:text-muted text-sm">
        ← Home
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="wordmark text-cream text-4xl">{data.title}</h1>
        <p className="text-muted mt-1">
          {new Date(data.airedAt).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {data.questions.length} questions
        </p>
      </header>

      {/* Winners */}
      {data.leaderboard.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-cream mb-3">🏆 Final Standings</h2>
          <div className="space-y-2">
            {data.leaderboard.slice(0, 5).map((p) => (
              <div
                key={p.rank}
                className={`flex items-center justify-between rounded-xl px-4 py-3 font-bold ${
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
        </section>
      )}

      {/* Questions */}
      <section>
        <h2 className="text-lg font-bold text-cream mb-3">Questions</h2>
        <div className="space-y-5">
          {data.questions.map((q) => (
            <div
              key={q.order}
              className="rounded-2xl bg-surface border border-line/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-cream">
                  <span className="text-muted mr-2">Q{q.order + 1}.</span>
                  {q.text}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted uppercase tracking-wide">
                {q.category} · {q.difficulty}
              </div>

              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => {
                  const s = answerStyle(i);
                  const n = q.crowd.counts[i] ?? 0;
                  const pct =
                    q.crowd.total > 0 ? Math.round((n / q.crowd.total) * 100) : 0;
                  const correct = q.correctIndex === i;
                  return (
                    <div
                      key={i}
                      className={`relative overflow-hidden rounded-lg border ${
                        correct ? "border-gold" : "border-line/40"
                      }`}
                    >
                      {/* crowd bar fill */}
                      <div
                        className={`absolute inset-y-0 left-0 ${s.bg} opacity-25`}
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between px-3 py-2">
                        <span className="flex items-center gap-2 text-cream">
                          <span>{s.shape}</span>
                          {opt}
                          {correct && <span className="text-gold">✓</span>}
                        </span>
                        <span className="text-muted text-sm">
                          {pct}% ({n})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {q.crowd.total === 0 && (
                <div className="mt-2 text-xs text-muted">No answers recorded.</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

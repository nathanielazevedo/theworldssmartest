"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const HOST_PASSWORD = "dogparty";
const HOST_AUTH_KEY = "triviaHostAuth";
const TARGET = 5;

const DIFF_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

export default function CuratePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(localStorage.getItem(HOST_AUTH_KEY) === HOST_PASSWORD);
  }, []);

  if (authed === null) return null;
  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;
  return <Picker />;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === HOST_PASSWORD) {
      localStorage.setItem(HOST_AUTH_KEY, HOST_PASSWORD);
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="bg-surface rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-cream text-xl font-black">Host Access</h1>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="bg-surface-2 border border-line rounded-lg px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-gold"
        />
        {error && <p className="text-red-bright text-sm">Wrong password.</p>}
        <button
          type="submit"
          className="bg-gold hover:bg-gold-bright text-ink font-black rounded-lg py-3 transition"
        >
          Enter
        </button>
      </form>
    </main>
  );
}

function Picker() {
  const router = useRouter();
  const questions = useQuery(api.practice.listForPicker);
  const [selected, setSelected] = useState<Id<"questionBank">[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [sabotage, setSabotage] = useState(false);

  const categories = [
    "All",
    ...Array.from(new Set((questions ?? []).map((q) => q.category))).sort(),
  ];

  const filtered = (questions ?? []).filter((q) => {
    if (catFilter !== "All" && q.category !== catFilter) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const toggle = (id: Id<"questionBank">) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TARGET) return prev;
      return [...prev, id];
    });
  };

  const startQuiz = () => {
    const params = new URLSearchParams({ ids: selected.join(",") });
    if (sabotage) params.set("sabotage", "1");
    router.push(`/practice?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-ink text-cream pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ink/95 backdrop-blur border-b border-line px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
          <div>
            <h1 className="font-black text-xl leading-none">Pick Questions</h1>
            <p className="text-muted text-sm mt-0.5">
              Choose exactly {TARGET} — answers hidden
            </p>
            {/* Sabotage toggle */}
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sabotage}
                onChange={(e) => setSabotage(e.target.checked)}
                className="accent-gold w-4 h-4"
              />
              <span className="text-sm text-muted">
                <span className="text-cream font-semibold">Sabotage mode</span>{" "}
                — secretly make one answer wrong
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold ${selected.length === TARGET ? "text-gold" : "text-muted"}`}
            >
              {selected.length}/{TARGET} selected
            </span>
            <button
              onClick={startQuiz}
              disabled={selected.length !== TARGET}
              className="bg-gold hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed text-ink font-black text-sm rounded-lg px-5 py-2.5 transition"
            >
              Begin Evaluation →
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-3 max-w-3xl mx-auto">
          <input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted outline-none focus:border-gold"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-cream outline-none focus:border-gold"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected tray */}
      {selected.length > 0 && (
        <div className="bg-surface border-b border-line px-6 py-3">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted font-semibold uppercase tracking-wide mr-1">
              Selected:
            </span>
            {selected.map((id, i) => {
              const q = questions?.find((x) => x._id === id);
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className="flex items-center gap-1.5 bg-gold/10 border border-gold/40 text-gold text-xs font-semibold rounded-full px-3 py-1 hover:bg-red/10 hover:border-red/40 hover:text-red-bright transition"
                  title="Click to remove"
                >
                  <span className="text-gold/60 font-normal">{i + 1}.</span>
                  <span className="max-w-[180px] truncate">
                    {q?.text ?? id}
                  </span>
                  <span className="ml-0.5 opacity-60">×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question list */}
      <div className="px-6 pt-4 space-y-2 max-w-3xl mx-auto">
        {questions === undefined && (
          <p className="text-muted text-sm text-center py-16">Loading…</p>
        )}
        {questions !== undefined && filtered.length === 0 && (
          <p className="text-muted text-sm text-center py-16">
            No questions match.
          </p>
        )}
        {filtered.map((q) => {
          const isSelected = selected.includes(q._id);
          const isFull = selected.length >= TARGET && !isSelected;

          return (
            <button
              key={q._id}
              onClick={() => toggle(q._id)}
              disabled={isFull}
              className={`w-full text-left rounded-xl border px-5 py-4 flex items-start gap-4 transition ${
                isSelected
                  ? "bg-gold/10 border-gold/60 ring-1 ring-gold/40"
                  : isFull
                    ? "bg-surface border-line opacity-40 cursor-not-allowed"
                    : "bg-surface border-line hover:border-gold/40 hover:bg-surface-2"
              }`}
            >
              {/* Checkbox */}
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-black ${
                  isSelected ? "bg-gold border-gold text-ink" : "border-line"
                }`}
              >
                {isSelected ? selected.indexOf(q._id) + 1 : ""}
              </span>

              {/* Text */}
              <span className="flex-1">
                <span className="text-cream font-semibold leading-snug block">
                  {q.text}
                </span>
                <span className="flex gap-3 mt-1.5 text-xs">
                  <span className="text-muted">{q.category}</span>
                  <span className={DIFF_COLOR[q.difficulty] ?? "text-muted"}>
                    {q.difficulty}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating bottom bar on mobile */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-ink/90 backdrop-blur border-t border-line flex items-center justify-between gap-4 sm:hidden">
          <span className="text-sm text-muted font-semibold">
            {selected.length}/{TARGET} selected
          </span>
          <button
            onClick={startQuiz}
            disabled={selected.length !== TARGET}
            className="bg-gold hover:bg-gold-bright disabled:opacity-40 text-ink font-black text-sm rounded-lg px-5 py-3 transition"
          >
            Begin Evaluation →
          </button>
        </div>
      )}
    </main>
  );
}

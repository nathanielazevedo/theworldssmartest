"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const HOST_PASSWORD = "dogparty";
const HOST_AUTH_KEY = "triviaHostAuth";

const DIFFICULTIES = ["easy", "medium", "hard"];
const CATEGORIES = [
  "General",
  "Science",
  "History",
  "Pop Culture",
  "Sports",
  "Geography",
  "Tech",
  "Food",
  "Art",
  "Music",
];

type Question = {
  _id: Id<"questionBank">;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string;
  timeLimitSec: number;
  approved: boolean;
  source: "authored" | "ai";
};

type FormState = {
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string;
  timeLimitSec: number;
};

const emptyForm = (): FormState => ({
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  category: "General",
  difficulty: "medium",
  timeLimitSec: 20,
});

export default function QuestionsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(localStorage.getItem(HOST_AUTH_KEY) === HOST_PASSWORD);
  }, []);

  if (authed === null) return null;
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

  return <QuestionsManager />;
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
    <main className="min-h-screen bg-ink flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="bg-surface rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-cream text-xl font-black">Question Manager</h1>
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

function QuestionsManager() {
  const questions = useQuery(api.questions.listAll);
  const createQ = useMutation(api.questions.create);
  const updateQ = useMutation(api.questions.update);
  const removeQ = useMutation(api.questions.remove);
  const setApproved = useMutation(api.questions.setApproved);
  const bulkCreate = useMutation(api.questions.bulkCreate);

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<Id<"questionBank"> | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "unapproved">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Id<"questionBank"> | null>(
    null,
  );
  const [bulkJson, setBulkJson] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<number | null>(null);

  const handleBulkUpload = async () => {
    setBulkError("");
    setBulkResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setBulkError("Invalid JSON — couldn't parse.");
      return;
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const required = ["text", "options", "correctIndex"];
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i] as Record<string, unknown>;
      for (const field of required) {
        if (!(field in q)) {
          setBulkError(`Question ${i + 1} is missing "${field}".`);
          return;
        }
      }
    }
    setBulkUploading(true);
    try {
      const count = await bulkCreate({
        questions: arr.map((q: Record<string, unknown>) => ({
          text: q.text as string,
          options: q.options as string[],
          correctIndex: q.correctIndex as number,
          category: (q.category as string) ?? "General",
          difficulty: (q.difficulty as string) ?? "medium",
          timeLimitSec: (q.timeLimitSec as number) ?? 20,
          approved: q.approved !== false,
        })),
      });
      setBulkResult(count);
      setBulkJson("");
    } catch (e) {
      setBulkError(String(e));
    } finally {
      setBulkUploading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (q: Question) => {
    setEditingId(q._id);
    setForm({
      text: q.text,
      options: [...q.options],
      correctIndex: q.correctIndex,
      category: q.category,
      difficulty: q.difficulty,
      timeLimitSec: q.timeLimitSec,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const filtered = form.options.filter((o) => o.trim() !== "");
      if (editingId) {
        await updateQ({ id: editingId, ...form, options: filtered });
      } else {
        await createQ({ ...form, options: filtered });
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const filtered = (questions ?? []).filter((q) => {
    if (filter === "approved" && !q.approved) return false;
    if (filter === "unapproved" && q.approved) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const setOption = (i: number, val: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[i] = val;
      return { ...f, options };
    });
  };

  const addOption = () =>
    setForm((f) => ({ ...f, options: [...f.options, ""] }));

  const removeOption = (i: number) => {
    setForm((f) => {
      const options = f.options.filter((_, idx) => idx !== i);
      return {
        ...f,
        options,
        correctIndex: f.correctIndex >= options.length ? 0 : f.correctIndex,
      };
    });
  };

  return (
    <main className="min-h-screen bg-ink text-cream pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ink/95 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="font-black text-xl">Question Pool</h1>
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted outline-none focus:border-gold"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-cream outline-none focus:border-gold"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="unapproved">Unapproved</option>
          </select>
        </div>
        <button
          onClick={() => {
            setShowBulk(true);
            setBulkError("");
            setBulkResult(null);
          }}
          className="bg-surface-2 hover:bg-line border border-line text-cream font-bold text-sm rounded-lg px-4 py-2 transition shrink-0"
        >
          Upload JSON
        </button>
        <button
          onClick={openNew}
          className="bg-gold hover:bg-gold-bright text-ink font-black text-sm rounded-lg px-4 py-2 transition shrink-0"
        >
          + Add Question
        </button>
      </div>

      {/* Stats bar */}
      {questions && (
        <div className="px-6 py-3 flex gap-6 text-sm text-muted border-b border-line">
          <span>
            <strong className="text-cream">{questions.length}</strong> total
          </span>
          <span>
            <strong className="text-gold">
              {questions.filter((q) => q.approved).length}
            </strong>{" "}
            approved
          </span>
          <span>
            <strong className="text-muted">
              {questions.filter((q) => !q.approved).length}
            </strong>{" "}
            unapproved
          </span>
        </div>
      )}

      {/* Question list */}
      <div className="px-6 pt-4 space-y-3 max-w-4xl mx-auto">
        {questions === undefined && (
          <p className="text-muted text-sm py-10 text-center">Loading…</p>
        )}
        {questions !== undefined && filtered.length === 0 && (
          <p className="text-muted text-sm py-10 text-center">
            No questions found.
          </p>
        )}
        {filtered.map((q) => (
          <div
            key={q._id}
            className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-cream font-semibold leading-snug flex-1">
                {q.text}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {/* Approved toggle */}
                <button
                  onClick={() =>
                    setApproved({ id: q._id, approved: !q.approved })
                  }
                  className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                    q.approved
                      ? "bg-gold/20 text-gold hover:bg-red/20 hover:text-red-bright"
                      : "bg-line text-muted hover:bg-gold/20 hover:text-gold"
                  }`}
                  title={q.approved ? "Click to unapprove" : "Click to approve"}
                >
                  {q.approved ? "✓ Approved" : "Unapproved"}
                </button>
                <button
                  onClick={() => openEdit(q)}
                  className="text-xs text-muted hover:text-cream bg-surface-2 hover:bg-line px-3 py-1 rounded-full transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(q._id)}
                  className="text-xs text-muted hover:text-red-bright bg-surface-2 hover:bg-red/10 px-3 py-1 rounded-full transition"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded-lg border ${
                    i === q.correctIndex
                      ? "border-gold/60 bg-gold/10 text-gold font-semibold"
                      : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </div>
              ))}
            </div>

            <div className="flex gap-3 text-xs text-muted">
              <span className="bg-surface-2 px-2 py-0.5 rounded">
                {q.category}
              </span>
              <span className="bg-surface-2 px-2 py-0.5 rounded capitalize">
                {q.difficulty}
              </span>
              <span className="bg-surface-2 px-2 py-0.5 rounded">
                {q.timeLimitSec}s
              </span>
              <span className="bg-surface-2 px-2 py-0.5 rounded">
                {q.source}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-6 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-line rounded-2xl p-6 w-full max-w-xl flex flex-col gap-5 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg">
                {editingId ? "Edit Question" : "New Question"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-muted hover:text-cream text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Question text */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted font-semibold">Question</span>
              <textarea
                required
                rows={3}
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
                className="bg-surface-2 border border-line rounded-lg px-4 py-3 text-cream placeholder:text-muted outline-none focus:border-gold resize-none"
                placeholder="What is…?"
              />
            </label>

            {/* Options */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted font-semibold">
                Answer Options{" "}
                <span className="font-normal">
                  (click radio to mark correct)
                </span>
              </span>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={form.correctIndex === i}
                    onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                    className="accent-yellow-400 shrink-0"
                  />
                  <input
                    required
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 bg-surface-2 border border-line rounded-lg px-3 py-2 text-cream placeholder:text-muted text-sm outline-none focus:border-gold"
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-muted hover:text-red-bright text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {form.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-muted hover:text-cream text-sm self-start mt-1"
                >
                  + Add option
                </button>
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted font-semibold">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-cream text-sm outline-none focus:border-gold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted font-semibold">
                  Difficulty
                </span>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, difficulty: e.target.value }))
                  }
                  className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-cream text-sm outline-none focus:border-gold"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted font-semibold">
                  Time (sec)
                </span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={form.timeLimitSec}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timeLimitSec: Number(e.target.value),
                    }))
                  }
                  className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-cream text-sm outline-none focus:border-gold"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-muted hover:text-cream bg-surface-2 hover:bg-line text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-gold hover:bg-gold-bright text-ink font-black text-sm transition disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Add Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk JSON upload modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-5 my-8">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg">Bulk Upload JSON</h2>
              <button
                onClick={() => setShowBulk(false)}
                className="text-muted hover:text-cream text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-surface-2 rounded-lg p-4 text-xs text-muted font-mono space-y-1 border border-line">
              <p className="text-cream font-semibold mb-2 font-sans text-sm">
                Expected format (array of objects):
              </p>
              <pre className="whitespace-pre-wrap leading-relaxed">{`[
  {
    "text": "What is the capital of France?",
    "options": ["Berlin", "Paris", "Rome", "Madrid"],
    "correctIndex": 1,
    "category": "Geography",   // optional, defaults to "General"
    "difficulty": "easy",      // optional, defaults to "medium"
    "timeLimitSec": 20,        // optional, defaults to 20
    "approved": true           // optional, defaults to true
  }
]`}</pre>
            </div>

            <textarea
              rows={12}
              value={bulkJson}
              onChange={(e) => {
                setBulkJson(e.target.value);
                setBulkError("");
                setBulkResult(null);
              }}
              placeholder="Paste your JSON array here…"
              className="bg-surface-2 border border-line rounded-lg px-4 py-3 text-cream placeholder:text-muted text-sm font-mono outline-none focus:border-gold resize-y"
            />

            {bulkError && (
              <p className="text-red-bright text-sm bg-red/10 border border-red/30 rounded-lg px-4 py-3">
                {bulkError}
              </p>
            )}
            {bulkResult !== null && (
              <p className="text-gold text-sm bg-gold/10 border border-gold/30 rounded-lg px-4 py-3">
                ✓ Successfully imported <strong>{bulkResult}</strong> question
                {bulkResult !== 1 ? "s" : ""}.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulk(false)}
                className="px-4 py-2 rounded-lg text-muted hover:text-cream bg-surface-2 hover:bg-line text-sm transition"
              >
                Close
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkJson.trim()}
                className="px-5 py-2 rounded-lg bg-gold hover:bg-gold-bright text-ink font-black text-sm transition disabled:opacity-50"
              >
                {bulkUploading ? "Uploading…" : "Import Questions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-black text-lg text-cream">Delete question?</h2>
            <p className="text-muted text-sm">This can&apos;t be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-muted hover:text-cream bg-surface-2 hover:bg-line text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await removeQ({ id: confirmDelete });
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-red/20 hover:bg-red/30 text-red-bright font-bold text-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

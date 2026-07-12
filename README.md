# Live Trivia

Real-time, multiplayer trivia for live streams. Built with **Next.js + Convex**.

Three surfaces:

| Route | Who it's for |
| --- | --- |
| `/host` | You (off-camera): create a game, drive questions, reveal answers |
| `/play` | The audience on their phones: enter a nickname, tap answers |
| `/broadcast` | The view you capture in OBS and put on the stream |

Only **one game runs at a time** — players just go to `/play` and join whatever
game the host has started. No game codes.

## Running it locally

You need **two processes** running at once — Convex (the realtime backend) and Next.js (the web app).

```bash
# Terminal 1 — realtime backend (local, no account needed)
CONVEX_AGENT_MODE=anonymous npx convex dev

# Terminal 2 — web app
npm run dev
```

Then:

1. Open `/host`, click **Load sample questions**, pick some, and **Start game**.
2. Open `/broadcast` (put this in OBS as a Browser Source at 1920×1080).
3. On phones/other tabs, open `/play` and enter a nickname to join.
4. Drive the game from `/host`: **Start ▶ → Reveal → Show leaderboard → Next question ▶**.

> `CONVEX_AGENT_MODE=anonymous` runs a local Convex deployment with no login. To use
> a hosted deployment (for real streams), run `npx convex login` then `npx convex dev`,
> and deploy the frontend to Vercel with `NEXT_PUBLIC_CONVEX_URL` set to your prod URL.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run dev:convex` — Convex backend (add `CONVEX_AGENT_MODE=anonymous` for local)
- `npm run typecheck` — `tsc --noEmit` (authoritative type check; the Next build skips its own)
- `npm run build` — production build

## How it works

- **`convex/schema.ts`** — data model: `games`, `questionBank`, `gameQuestions`, `players`, `answers`.
- **`convex/games.ts`** — game lifecycle. The player-facing `state` query withholds the
  correct answer until the host reveals it (anti-cheat).
- **`convex/answers.ts`** — server-authoritative scoring: Kahoot-style speed points
  (500–1000 for correct), rejects late and duplicate answers.
- Every screen subscribes to reactive Convex queries, so answers, counts, and the
  leaderboard update live with no polling or WebSocket code.

## Roadmap (from the plan)

- **Phase 2** — Framer Motion polish, join QR on the broadcast lobby.
- **Phase 3** — Convex Auth accounts + global leaderboard; AI question generation
  (Claude API in a Convex action, host-approved before going live).
- **Phase 4** — rate limiting, reconnect handling, deploy.

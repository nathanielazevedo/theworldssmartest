# Host Guide — running a live trivia stream

Everything runs on your **production** site (`theworldssmartest-p37z.vercel.app`).
Don't mix local/dev with prod during a real show — host, broadcast, and players
must all be on the **same** deployment or they won't see the same game.

## The three windows you'll use

| Window | URL | Where it goes |
| --- | --- | --- |
| **Host control** | `/host` (password `dogparty`) | **Off-screen. NEVER on stream** — it shows the correct answers. |
| **Broadcast** | `/broadcast` | Captured by OBS → this is what viewers see. |
| **Your phone** | `/play` | Optional, so you see what players see. |

Ideal setup: **two monitors** — `/host` on one (your cockpit), OBS on the other.

---

## One-time setup

### OBS
1. **Scenes:**
   - *Starting Soon* — a holding card while people arrive.
   - *Trivia* — the main scene (below).
   - *(optional) Chat/Break.*
2. In the **Trivia** scene, add sources:
   - **Browser** source → URL `https://theworldssmartest-p37z.vercel.app/broadcast`, size **1920×1080**. (Tick "Shutdown source when not visible" OFF so it stays connected.)
   - **Video Capture** (your webcam), cornered.
   - **Audio Input** (your mic).
   - Mute the Browser source's audio — it has none.
3. Settings → Output: 1080p, ~4500–6000 kbps, 30/60 fps.

### YouTube
1. YouTube Studio → **Go Live** → get your **stream key**, paste into OBS (Settings → Stream).
2. Set **Latency: Low** (or Ultra-low). This keeps stream-only viewers closer to real time so they're not far behind the in-app players.
3. Put the join URL everywhere: stream **title/description**, say it out loud, and it's already big on the broadcast **lobby** screen.

---

## Before you hit "Go Live"

1. Open `/host`, enter `dogparty`, **New game**, pick ~**18 questions** (easy → hard), **Start game** — it drops into the **lobby**.
2. The **/broadcast** lobby now shows the **join URL + live player count**. This is your "Starting Soon" content.
3. Quick check: join from your phone at `/play`, confirm you appear in the lobby.
4. Go live on YouTube. Chat for a few minutes on the lobby screen while players trickle in.

---

## Running the show — the beat for each question

1. **Tease it:** "Question 5… Science… 20 seconds on the clock."
2. Click **Next question ▶** in `/host`.
   → the question + timer appear on `/broadcast` and on every player's `/play`.
3. **Read it aloud**, banter while the countdown runs (it turns red in the last 5s).
4. When the timer hits 0 (buttons auto-lock on phones), click **Reveal answer**.
   → correct answer pops, crowd's vote bars grow — on the broadcast *and* every phone.
5. **React:** "It was Mars — only 40% of you got that one!"
6. Click **Show leaderboard** → animated podium. Hype the leader / the comeback.
7. Repeat. After the last question, hit **Next question ▶** once more → the game
   **ends** and the **Final Results** podium plays. Crown your winner. 👑

That's the whole loop: **Next → (read + banter) → Reveal → Leaderboard → Next.**

---

## Things to know

- **You control the pace, not the stream.** Everything is driven by your clicks in
  `/host`, so the ~10–30s YouTube delay never desyncs the game itself.
- **In-app players are the real competition.** People watching *only* the stream are
  a bit behind due to delay — encourage them to open `/play` to actually compete.
- **Keep `/host` private.** It shows correct answers. Don't screen-share it, don't
  put that monitor on camera.
- **After the show:** the episode auto-archives. It appears on the homepage under
  **Past Streams** with the winner and crowd stats — share that link as the recap.

---

## Pre-flight checklist
- [ ] `/host` open on a non-captured screen, logged in
- [ ] OBS **Trivia** scene shows the `/broadcast` browser source cleanly at 1080p
- [ ] Webcam + mic live and levels good
- [ ] Game created, sitting in **lobby**, join URL visible on broadcast
- [ ] Joined once from your phone to confirm
- [ ] YouTube latency set to Low, stream key in OBS
- [ ] Did a 2-minute **unlisted** test stream earlier to confirm it all renders

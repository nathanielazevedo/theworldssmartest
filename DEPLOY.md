# Deploying to a live site

Two things get deployed:

1. **Convex** — your realtime backend (database + functions), hosted by Convex in the cloud.
2. **Next.js frontend** — the web app, hosted on **Vercel**.

You've been running Convex in *anonymous local* mode. Going live means switching to a
real (free) Convex cloud project, then pointing a Vercel deploy at it.

---

## Step 1 — Create a Convex cloud project

Run these locally (the first opens a browser to sign in — **this can't be automated**):

```bash
npx convex login          # opens browser, create a free account
npx convex dev --configure=new   # creates a cloud project + dev deployment
```

When it asks, give the project a name (e.g. `smartest-person`). This rewrites
`.env.local` to point at your new cloud deployment instead of the local one.

Leave that `convex dev` running while you develop; stop it (Ctrl-C) when done.

## Step 2 — Load your questions into the cloud

Your questions live in `convex/seed.ts` (source of truth). Seed the cloud dev
deployment so there's content to play with:

```bash
npx convex run seed:reseed
```

(You'll re-seed **production** in Step 5.)

---

## Step 3 — Get the code into GitHub

Vercel deploys from a Git repo. From the project root:

```bash
git init
git add -A
git commit -m "Initial commit"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

`.env.local` and `.convex/` are gitignored, so no secrets or local data get pushed.

---

## Step 4 — Deploy the frontend on Vercel

1. Go to **vercel.com** → **Add New… → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. **Override the Build Command** with:
   ```
   npx convex deploy --cmd 'npm run build'
   ```
   This deploys your Convex **production** functions AND builds the site with the
   correct `NEXT_PUBLIC_CONVEX_URL` injected automatically.
4. Add an **Environment Variable**:
   - Name: `CONVEX_DEPLOY_KEY`
   - Value: from the **Convex dashboard → your project → Settings → Deploy Keys →
     Generate Production Deploy Key**.
5. Click **Deploy**.

Your site goes live at `https://<project>.vercel.app`.

## Step 5 — Seed production questions

Point a one-off seed at the production deployment:

```bash
npx convex run seed:reseed --prod
```

---

## Step 6 (recommended) — Custom domain

Your broadcast lobby tells viewers to go to `<yourdomain>/play`, so a short domain
is worth it. In Vercel → your project → **Settings → Domains**, add a domain you own
(e.g. `smartest.tv`). Viewers then just type `smartest.tv/play`.

---

## Day-to-day after launch

- **Change/add questions:** edit `convex/seed.ts`, then `npx convex run seed:reseed --prod`
  (or add them live via the host UI, which writes straight to the prod DB).
- **Ship code changes:** `git push` — Vercel rebuilds and redeploys Convex + frontend.
- **Run a show:** open `https://<domain>/host` (password `dogparty`), start a game,
  put `https://<domain>/broadcast` in OBS, and point your audience at `/play`.

## Notes & limits

- Convex's free tier comfortably covers small/medium streams. If you expect thousands
  of simultaneous answerers, watch your Convex usage dashboard.
- The host password is still **client-side** (`dogparty` in `app/host/page.tsx`). Before
  a public launch, consider moving it server-side (Convex env var) so the game controls
  are actually protected. Ask and I'll wire that up.
- `NEXT_PUBLIC_CONVEX_URL` is the only frontend env var, and the Convex build command
  sets it for you — you don't set it manually in Vercel.

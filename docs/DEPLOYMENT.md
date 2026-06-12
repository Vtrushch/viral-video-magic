# HookCut — Deployment Runbook (June 2026)

Three deployable parts: **frontend** (Lovable auto-deploys from `main`),
**Modal worker** (`modal deploy`), **Supabase** (SQL migrations).

## 0. What shipped in this release

1. **URL-import fix + multi-platform** (`modal_worker.py`) — needs Modal redeploy.
2. **Content Calendar v1** — needs Supabase migration + Modal redeploy (reminder cron).
3. Frontend for both — deploys automatically when `main` is pushed.

Deploy order: **migration → Modal worker → (frontend already live)**.

## 1. Supabase migration (2 minutes)

Supabase Dashboard → project `chogrmyerbtlcndpjtfs` → SQL Editor → paste & run:
`supabase/migrations/20260612200000_scheduled_posts.sql`

Verify: Table Editor shows `scheduled_posts` with RLS enabled.

## 2. Modal worker redeploy (5 minutes)

```bash
pip install modal            # if not installed
modal token new              # one-time auth in browser
cd ~/viral-video-magic
modal deploy modal_worker.py
```

Verify: `modal app list` shows `cutviral-worker` updated;
https://vtrushch--cutviral-worker-webhook.modal.run/docs shows `/url-import`.

## 3. 🔑 YouTube proxy — THE fix for import failures (15 minutes, ~$4–8/mo)

**Why:** YouTube hard-blocks datacenter IPs (Modal egress) in 2026 — bot-check
after 5–10 downloads, cookies get invalidated when used from a DC IP, and all
public fallback APIs (Cobalt/Invidious/Piped) are dead. The only reliable
production path is yt-dlp through a **rotating residential proxy**.

1. Buy a small rotating-residential plan (any of: Decodo/Smartproxy, IPRoyal,
   Webshare, DataImpulse). 2–5 GB/mo is plenty to start (~200–400 MB per 720p import;
   most imports are TikTok/IG which don't need the proxy).
2. Get the gateway URL, e.g. `http://USER:PASS@gate.decodo.com:7000`.
3. Add it to the existing Modal secret:
   - modal.com → Secrets → `youtube-cookies` → add key `YTDLP_PROXY` = that URL.
4. No redeploy needed (read at runtime). Test: import any YouTube URL in the app.

Optional keys in the same secret (all read at runtime):
| Key | Purpose |
|-----|---------|
| `YTDLP_PROXY` | residential proxy for all yt-dlp downloads |
| `YOUTUBE_COOKIES_B64` | base64 Netscape cookies (refresh ~monthly from a throwaway Google account) |
| `INSTAGRAM_COOKIES_B64` / `TIKTOK_COOKIES_B64` / `FACEBOOK_COOKIES_B64` / `TWITTER_COOKIES_B64` | per-platform cookies if those imports ever need login |
| `COBALT_API_URL` + `COBALT_API_KEY` | optional cobalt-compatible API fallback (self-hosted or paid) |

Refreshing YouTube cookies (when imports degrade even with proxy):
```bash
# In Chrome with a throwaway Google account logged into YouTube:
# export cookies.txt via "Get cookies.txt LOCALLY" extension, then:
base64 -i cookies.txt | pbcopy   # → paste into YOUTUBE_COOKIES_B64
```

## 4. Post-deploy verification checklist

- [ ] Import a public YouTube video → status goes downloading → uploaded (check Modal logs: `modal app logs cutviral-worker`)
- [ ] Import a TikTok URL → works
- [ ] Import garbage URL → friendly error in UI (not stuck "downloading")
- [ ] Dashboard → Calendar → schedule a post for +20 min → reminder email arrives (cron runs every 10 min)
- [ ] `/vs/opus-clip` page still renders (SEO regression check)

## 5. Known limits / phase 2

- Direct auto-posting (TikTok Content Posting API, IG Graph, YouTube Data) —
  DB columns (`external_post_id`, `publish_error`) already exist; requires
  platform app registrations + review (weeks). Build when calendar usage proves demand.
- Bundle is 3.4MB (one chunk) — add route-level code splitting when convenient.
- Imports >2GB are rejected by design (`--max-filesize 2000M`) — protects the 4GB worker.

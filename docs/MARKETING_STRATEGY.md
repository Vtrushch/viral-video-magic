# HookCut — Marketing & Organic Growth Strategy

**Goal:** capture 5–10% of OpusClip's paying customer base within 12 months.
**Written:** June 12, 2026 · **Owner:** Vito · **Status:** active

---

## 1. The math (what 5–10% actually means)

OpusClip (June 2026): ~$20M ARR, 10M+ registered users, $215M valuation (SoftBank-backed).
At a blended ~$20/mo ARPU that's roughly **80–90k paying customers**.

| Target | Paying customers | HookCut MRR (~$14 ARPU) |
|--------|-----------------|--------------------------|
| 5%     | ~4,200          | ~$59k MRR (~$700k ARR)   |
| 10%    | ~8,500          | ~$119k MRR (~$1.4M ARR)  |

**North star: $50k MRR.** Milestones: $1k → $5k → $15k → $50k MRR.
We don't need to beat OpusClip. We need to be the obvious choice for the
price-sensitive 80% of their funnel that churns or never converts.

## 2. Positioning — "The OpusClip that doesn't nickel-and-dime you"

One sentence: **HookCut turns long videos into viral clips for half the price —
analysis is always free, clips never expire, and your whole posting week is
planned in one place.**

Wedges vs OpusClip (all true today):
1. **Price:** $9 vs $15 Starter, $19 vs $29 Pro. Render-credit model (analysis/editing free) vs their per-minute credits.
2. **Clips never expire** (their free tier deletes in days — top complaint).
3. **Built-in Content Calendar** with email reminders — free on every plan (they gate scheduling behind higher tiers).
4. **Import from anywhere:** YouTube, TikTok, Instagram, X, Facebook, Vimeo, Twitch, Rumble, Dailymotion, Loom.
5. **True localization:** full UI in English, Українська, Español — OpusClip is EN-first. UA + LATAM creator markets are underserved and growing.
6. **Transparent billing** (their billing complaints are public and plentiful — never match that energy).

Anti-positioning: don't fight on enterprise/teams/B-roll. Fight on price, trust, simplicity, and posting workflow.

## 3. Channel plan (ranked by expected ROI for a solo founder)

### Tier 1 — compounding, start immediately

**A. Comparison & alternative SEO (highest intent traffic that exists)**
- `/vs/opus-clip` exists — expand to a cluster: "OpusClip alternative", "OpusClip pricing explained", "OpusClip vs Klap vs HookCut", "best OpusClip alternative for podcasters".
- Ship the same cluster in **Spanish and Ukrainian** (near-zero competition: "alternativa a OpusClip", "OpusClip альтернатива").
- Target the full competitor set already in `competitors.ts` (13 slugs) + long-tails: "Klap alternative", "Vizard alternative", "2short alternative".
- Cadence: 2 SEO pages/week, generated with Claude, human-reviewed. Every page: comparison table + honest "when they're better" section (builds trust, ranks better).

**B. Dogfooding content engine (the product makes its own ads)**
- Take trending podcast/creator episodes → run through HookCut → post the best clips on TikTok/Shorts/Reels from HookCut-branded accounts with visible captions style + "made with HookCut in 4 minutes" hook.
- 1 long video → 10 clips → 3 platforms = 30 posts/week from ~2 hours of work. Use the new Content Calendar to schedule it (screenshot that calendar — it's also product marketing).
- Formats that work in this niche: speed-runs ("podcast → 10 clips in 5 min"), price comparisons ("what $9 gets you vs $29"), caption-style showdowns.

**C. Free-tier watermark as distribution**
- Watermark on free renders = every free user's post is an ad. Make the watermark a short branded handle ("hookcut.com"), tasteful enough that people leave it.

### Tier 2 — bursts of users + reviews

**D. Launch circuit (one per month, in this order)**
1. **Product Hunt** — angle: "OpusClip alternative at half the price, with a built-in content calendar". Prep: 20 friendlies, launch video made in HookCut.
2. **AppSumo / lifetime-deal platforms** — fastest path to 1–3k paying users + hundreds of reviews. Margin hit is fine at this stage; cap renders on LTD tiers to protect Modal GPU costs.
3. **Uneed / Peerlist / Hacker News "Show HN"** — incremental but free.

**E. Affiliate program — 30% recurring**
- Tolt or Rewardful on top of Stripe (~1 day to wire).
- Recruit: every "AI tools" YouTuber/TikToker who has ever reviewed OpusClip (search their comments for price complaints — those creators' audiences are pre-qualified switchers).
- Seed 50 creators (10k–100k subs) with free Pro for 6 months + their affiliate link.

### Tier 3 — manual but high-conversion

**F. Communities (value-first, 2 posts/week max)**
- Reddit: r/NewTubers, r/PodcastGuestExchange, r/podcasting, r/youtubers, r/SocialMediaMarketing. Answer "how do I make shorts from my podcast" questions; mention HookCut only when genuinely relevant or in comparison threads about OpusClip pricing.
- Facebook groups: podcast editors, UA/ES creator communities (unfair advantage: native Ukrainian).
- Discord: creator-economy and faceless-channel servers.

**G. Direct outreach (when Agency plan matters)**
- 10/day DMs to podcast production agencies and social media managers: free month of Agency, white-glove import of their last episode (do it for them, send the clips).

## 4. Conversion & retention levers

- **Failed-import rescue:** import errors now suggest direct file upload (shipped) — watch PostHog `video_upload_failed` funnel weekly.
- **Email lifecycle (Resend already wired):** welcome → first-clips-ready → credits-low (exists) + add: day-3 "your clips are waiting", weekly "your posting week" digest from the calendar.
- **Calendar habit loop:** scheduled-post reminders (shipped) bring users back weekly — retention is the moat OpusClip's credit-anxiety model lacks.
- **Pricing page:** add "Switching from OpusClip?" banner → /vs/opus-clip → 20% off first 3 months coupon `SWITCH20`.
- **Review engine:** in-app ask after 3rd successful render → G2/Trustpilot/Capterra (OpusClip's weakest flank is billing reviews; ours must be spotless).

## 5. What NOT to do (yet)

- Paid ads vs a $215M-funded competitor's CPC — lose.
- Team features / enterprise sales — lose on roadmap depth.
- Building direct OAuth auto-posting before calendar usage proves demand (TikTok/Meta app reviews take weeks; phase 2, columns already in DB).
- More than 2 social platforms for our own content — depth beats spread solo.

## 6. 90-day execution plan

**Weeks 1–2: Foundation**
- Deploy import fix + buy rotating residential proxy (~$5–8/mo, see DEPLOYMENT.md) — import reliability is the #1 churn-before-value killer.
- Apply scheduled_posts migration; verify calendar E2E.
- Set up Tolt/Rewardful affiliate program.
- Create HookCut TikTok + YouTube Shorts accounts; first 10 dogfood clips scheduled via own calendar.

**Weeks 3–4: SEO sprint #1**
- 8 comparison/alternative pages live (EN), 4 ES, 4 UK.
- "Switching from OpusClip" banner + SWITCH20 coupon.
- In-app review prompt after 3rd render.

**Weeks 5–8: Launch circuit**
- Product Hunt launch (week 5–6).
- 30 dogfood posts/week running; double down on whichever platform shows traction.
- Recruit first 25 affiliates; seed 20 creators with free Pro.
- Reddit/community presence: 2 value posts/week.

**Weeks 9–12: Scale what worked**
- AppSumo LTD if MRR < $3k (cash + reviews); skip if organic is compounding.
- SEO sprint #2: 16 more pages targeting "[competitor] alternative" + "[use case] clips" (podcast clips, sermon clips, webinar clips, Twitch highlights).
- Email digest "your posting week" live.
- Outreach: 100 agencies contacted.

**KPIs (weekly review, PostHog + Stripe):**
- Signups, activation rate (signup → first ready clip), import success rate (target >95%), free→paid conversion (target 3–5%), MRR, churn (<6%/mo), organic sessions on /vs/* pages, affiliate signups.

## 7. Unfair advantages to lean on

1. **Claude-automated content factory** — SEO pages, clip descriptions, comparison updates at near-zero marginal cost.
2. **Native Ukrainian** — own the UA creator market completely before anyone notices it exists.
3. **Solo-founder economics** — profitable at $5k MRR; OpusClip needs $20M ARR to satisfy SoftBank. Price war is unwinnable *for them*.
4. **Speed** — ship in days what takes their PM org a quarter.

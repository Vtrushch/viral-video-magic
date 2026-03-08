export interface CompetitorData {
  slug: string;
  name: string;
  seo: {
    title: string;
    description: string;
    canonical: string;
  };
  keyMessage: string;
  verdictCards: { title: string; hookcut: string; competitor: string; winner: "hookcut" | "competitor" | "tie" }[];
  comparisonRows: { feature: string; hookcut: string | boolean; competitor: string | boolean }[];
  hookcutWins: { title: string; description: string }[];
  competitorWins: { title: string; description: string }[];
  pricingComparison: { tier: string; hookcut: string; competitor: string }[];
  faq: { question: string; answer: string }[];
}

export const COMPETITORS: Record<string, CompetitorData> = {
  "opus-clip": {
    slug: "opus-clip",
    name: "Opus Clip",
    seo: {
      title: "HookCut vs Opus Clip 2026: Full Comparison | HookCut",
      description: "HookCut vs Opus Clip 2026. 40% cheaper, no clip expiry, better caption styles. See why creators are switching.",
      canonical: "https://hookcut.com/vs/opus-clip",
    },
    keyMessage: "40% cheaper, clips don't expire, no surprise billing",
    verdictCards: [
      { title: "Price", hookcut: "$9–$39/mo", competitor: "$15–$29/mo", winner: "hookcut" },
      { title: "Clip Expiry", hookcut: "Never expires", competitor: "Deleted after 7 days (free)", winner: "hookcut" },
      { title: "Caption Styles", hookcut: "6+ styles + custom", competitor: "Limited customization", winner: "hookcut" },
    ],
    comparisonRows: [
      { feature: "Free plan", hookcut: "3 clips, no watermark timer", competitor: "60 credits/mo, watermark, clips deleted after 3 days" },
      { feature: "Starter price", hookcut: "$9/mo", competitor: "$15/mo" },
      { feature: "Pro price", hookcut: "$19/mo", competitor: "$29/mo" },
      { feature: "Clip expiry", hookcut: "Never", competitor: "1 week on free" },
      { feature: "Caption styles", hookcut: "6 styles + custom colors", competitor: "Limited customization" },
      { feature: "Face tracking", hookcut: true, competitor: true },
      { feature: "Viral score", hookcut: true, competitor: true },
      { feature: "Highlight Reel", hookcut: true, competitor: false },
      { feature: "YouTube import", hookcut: true, competitor: true },
      { feature: "AI B-roll", hookcut: false, competitor: "Pro only ($29/mo)" },
      { feature: "Team workspace", hookcut: "Coming soon", competitor: "Pro only ($29/mo)" },
      { feature: "Transparent billing", hookcut: true, competitor: "User complaints about billing" },
    ],
    hookcutWins: [
      { title: "40% cheaper across all plans", description: "HookCut Starter is $9/mo vs Opus Clip's $15/mo. Pro is $19 vs $29. Same core features, lower price." },
      { title: "Clips never expire", description: "Opus Clip deletes free clips after 3 days and paid clips after limited time. HookCut keeps your clips forever on paid plans." },
      { title: "Better caption customization", description: "6 distinct caption styles (Hormozi, MrBeast, Minimal, Neon, Fire, Elegant) plus custom colors and position control." },
      { title: "No surprise billing", description: "Transparent pricing with no aggressive billing practices. Multiple user complaints exist about Opus Clip's billing." },
    ],
    competitorWins: [
      { title: "AI B-roll generation", description: "Opus Clip Pro includes AI-generated B-roll footage to enhance clips — a feature HookCut doesn't offer yet." },
      { title: "20+ language support", description: "Opus Clip supports 20+ languages out of the box on their Starter plan." },
      { title: "Team workspace", description: "Opus Clip Pro includes collaborative team features for agencies working together." },
    ],
    pricingComparison: [
      { tier: "Free", hookcut: "$0 — 10 renders, 1 video", competitor: "$0 — 60 credits, watermark, clips deleted in 3 days" },
      { tier: "Starter", hookcut: "$9/mo — 40 renders, 5 videos", competitor: "$15/mo — 150 credits, 20+ languages" },
      { tier: "Pro", hookcut: "$19/mo — 100 renders, 25 videos", competitor: "$29/mo — 300 credits, AI B-roll, team workspace" },
      { tier: "Agency/Max", hookcut: "$39/mo — 250 renders, unlimited videos", competitor: "Custom pricing" },
    ],
    faq: [
      { question: "Is HookCut really 40% cheaper than Opus Clip?", answer: "Yes. HookCut Starter is $9/mo vs Opus Clip's $15/mo (40% savings). HookCut Pro is $19/mo vs $29/mo (34% savings). Both offer viral scoring, face tracking, and caption styles." },
      { question: "Do clips expire on HookCut?", answer: "No. On paid plans, your clips are stored indefinitely. Opus Clip deletes free plan clips after 3 days and limits storage on paid plans." },
      { question: "Does HookCut have a viral score like Opus Clip?", answer: "Yes. HookCut analyzes your clips and assigns a viral score based on hook strength, pacing, and engagement potential — similar to Opus Clip's virality score." },
      { question: "Can I import YouTube videos into HookCut?", answer: "Yes. HookCut supports direct YouTube URL import, just like Opus Clip. Paste your video link and HookCut handles the rest." },
      { question: "What caption styles does HookCut offer?", answer: "HookCut includes 6 distinct styles: Hormozi, MrBeast, Minimal, Neon, Fire, and Elegant. Each supports custom color selection and position adjustment via slider." },
    ],
  },
  vizard: {
    slug: "vizard",
    name: "Vizard",
    seo: {
      title: "HookCut vs Vizard 2026: Which AI Clipper Wins? | HookCut",
      description: "HookCut vs Vizard 2026. Better for solo creators: simpler workflow, more caption styles, $21/mo cheaper.",
      canonical: "https://hookcut.com/vs/vizard",
    },
    keyMessage: "Built for creators, not marketing teams. Simpler, faster, cheaper.",
    verdictCards: [
      { title: "Price", hookcut: "$9–$39/mo", competitor: "From $30/mo", winner: "hookcut" },
      { title: "Target User", hookcut: "Solo creators & small teams", competitor: "Marketing teams & enterprises", winner: "tie" },
      { title: "Ease of Use", hookcut: "Upload → clips in minutes", competitor: "Templates need heavy adjustment", winner: "hookcut" },
    ],
    comparisonRows: [
      { feature: "Starter price", hookcut: "$9/mo", competitor: "$30/mo" },
      { feature: "Free plan", hookcut: "3 clips free, no credit card", competitor: "Limited exports" },
      { feature: "Caption styles", hookcut: "6 styles + custom colors", competitor: "Template-based (needs manual adjustment)" },
      { feature: "Face tracking", hookcut: true, competitor: true },
      { feature: "Viral score", hookcut: true, competitor: false },
      { feature: "Highlight Reel", hookcut: true, competitor: false },
      { feature: "YouTube import", hookcut: true, competitor: true },
      { feature: "Emotional context detection", hookcut: true, competitor: "Misses emotional context" },
      { feature: "Bulk repurposing", hookcut: "Via upload queue", competitor: "Native bulk processing" },
      { feature: "Team features", hookcut: "Coming soon", competitor: true },
      { feature: "Branding templates", hookcut: "Coming soon", competitor: true },
      { feature: "Setup time", hookcut: "< 2 minutes", competitor: "15–30 minutes for template setup" },
    ],
    hookcutWins: [
      { title: "$21/mo cheaper at entry level", description: "HookCut Starter is $9/mo. Vizard starts at $30/mo. That's $252/year in savings for similar core functionality." },
      { title: "Simpler, faster workflow", description: "Upload your video and get clips in minutes. No template configuration, no branding setup, no learning curve." },
      { title: "Better AI emotional detection", description: "HookCut's AI catches emotional peaks, laugh moments, and hook-worthy segments. Vizard users report the AI misses emotional context." },
      { title: "More caption style options", description: "6 ready-to-use caption styles with custom colors vs Vizard's template-based approach that needs heavy manual adjustment." },
    ],
    competitorWins: [
      { title: "Built for marketing teams", description: "Vizard is designed for teams managing large content volumes with collaborative features and approval workflows." },
      { title: "Native bulk repurposing", description: "Vizard handles bulk processing of multiple videos more efficiently for high-volume content operations." },
      { title: "Branding templates", description: "Vizard offers branded templates for consistent visual identity across all clips — useful for agencies managing multiple brands." },
    ],
    pricingComparison: [
      { tier: "Free", hookcut: "$0 — 10 renders, 1 video", competitor: "$0 — Limited exports" },
      { tier: "Starter", hookcut: "$9/mo — 40 renders, 5 videos", competitor: "$30/mo — Standard features" },
      { tier: "Pro", hookcut: "$19/mo — 100 renders, 25 videos", competitor: "Custom pricing" },
      { tier: "Agency", hookcut: "$39/mo — 250 renders, unlimited", competitor: "Enterprise pricing" },
    ],
    faq: [
      { question: "Is HookCut better than Vizard for solo creators?", answer: "Yes. HookCut is built specifically for individual creators and small teams. It's simpler to use, 70% cheaper at entry level ($9 vs $30/mo), and doesn't require template setup." },
      { question: "Does Vizard have better team features?", answer: "Currently, yes. Vizard offers built-in team collaboration, approval workflows, and branded templates. HookCut's team features are coming soon." },
      { question: "How does AI clip detection compare?", answer: "HookCut's AI detects emotional peaks, hooks, and viral moments more accurately. Vizard users report that the AI sometimes misses emotional context in conversations." },
      { question: "Can I switch from Vizard to HookCut easily?", answer: "Yes. Simply upload your source videos to HookCut and re-generate clips. The process takes minutes, and you'll immediately benefit from lower pricing and better caption styles." },
      { question: "Which tool is better for webinars?", answer: "Vizard has an edge for bulk webinar repurposing with team workflows. HookCut is better if you want faster, more accurate clips from individual webinars without template overhead." },
    ],
  },
  descript: {
    slug: "descript",
    name: "Descript",
    seo: {
      title: "HookCut vs Descript 2026: Auto Clips vs Manual Editing | HookCut",
      description: "HookCut vs Descript 2026. HookCut finds your best moments automatically. Descript requires manual selection.",
      canonical: "https://hookcut.com/vs/descript",
    },
    keyMessage: "HookCut finds what to clip. Descript helps you edit it.",
    verdictCards: [
      { title: "Auto Clip Detection", hookcut: "AI finds best moments", competitor: "Manual selection required", winner: "hookcut" },
      { title: "Learning Curve", hookcut: "Upload → done in minutes", competitor: "Steep, full editor suite", winner: "hookcut" },
      { title: "Editing Depth", hookcut: "Clip-focused tools", competitor: "Full video editor", winner: "competitor" },
    ],
    comparisonRows: [
      { feature: "Primary purpose", hookcut: "AI clip extraction & optimization", competitor: "Full video/audio editing" },
      { feature: "Auto clip detection", hookcut: true, competitor: false },
      { feature: "Viral score", hookcut: true, competitor: false },
      { feature: "Face tracking", hookcut: true, competitor: false },
      { feature: "Caption styles", hookcut: "6 styles + custom", competitor: "Basic captions" },
      { feature: "Highlight Reel", hookcut: true, competitor: false },
      { feature: "Transcript-based editing", hookcut: false, competitor: true },
      { feature: "Filler word removal", hookcut: false, competitor: true },
      { feature: "Screen recording", hookcut: false, competitor: true },
      { feature: "Multi-track editing", hookcut: false, competitor: true },
      { feature: "Pro price", hookcut: "$19/mo", competitor: "$24/mo" },
      { feature: "Time to first clip", hookcut: "~3 minutes", competitor: "30+ minutes (manual)" },
    ],
    hookcutWins: [
      { title: "AI finds your best clips automatically", description: "HookCut's AI analyzes your video and surfaces the most viral-worthy moments. With Descript, you manually scrub through footage to find clip-worthy sections." },
      { title: "10x faster clip creation", description: "Upload → AI analysis → clips ready in minutes. Descript requires manual selection, trimming, and exporting — a 30+ minute process per video." },
      { title: "Purpose-built for short-form", description: "Every feature in HookCut is designed for creating TikToks, Reels, and Shorts. Descript is a general editor that happens to export short clips." },
      { title: "Viral optimization tools", description: "Viral scoring, hook analysis, face tracking, and 6 caption styles designed for engagement. Descript offers none of these." },
    ],
    competitorWins: [
      { title: "Full video editing suite", description: "Descript is a complete video editor with multi-track timeline, transitions, effects, and audio mixing. HookCut focuses on clip extraction, not full editing." },
      { title: "Transcript-based editing", description: "Edit video by editing text — Descript's killer feature. Delete words from the transcript and the video cuts automatically." },
      { title: "Filler word removal", description: "Descript automatically detects and removes 'um', 'uh', and other filler words from your recordings." },
      { title: "Screen recording", description: "Built-in screen and webcam recording for creating content from scratch — something HookCut doesn't do." },
    ],
    pricingComparison: [
      { tier: "Free", hookcut: "$0 — 10 renders, 1 video", competitor: "$0 — 1 hour transcription" },
      { tier: "Starter", hookcut: "$9/mo — 40 renders, 5 videos", competitor: "N/A" },
      { tier: "Pro", hookcut: "$19/mo — 100 renders, 25 videos", competitor: "$24/mo — Full editor, 24h transcription" },
      { tier: "Agency", hookcut: "$39/mo — 250 renders, unlimited", competitor: "Custom pricing" },
    ],
    faq: [
      { question: "Should I use HookCut or Descript?", answer: "It depends on your goal. If you want to automatically find and create short clips from long videos, use HookCut. If you need a full video editor with transcript-based editing, use Descript. Many creators use both." },
      { question: "Does HookCut replace Descript?", answer: "Not entirely. HookCut replaces the clip-finding process that takes hours in Descript. But if you need full video editing (multi-track, effects, screen recording), Descript is the better tool." },
      { question: "Can I use HookCut and Descript together?", answer: "Yes! A common workflow: use HookCut to find your best moments and generate clips, then import into Descript for fine-tuning if needed." },
      { question: "Is HookCut faster than Descript for making clips?", answer: "Significantly. HookCut produces clips in ~3 minutes via AI. In Descript, you manually find moments, trim, add captions, and export — typically 30+ minutes per clip." },
      { question: "Does Descript have AI clip detection?", answer: "No. Descript is a powerful editor but doesn't automatically identify viral-worthy moments. You need to manually review footage and select segments to clip." },
    ],
  },
};

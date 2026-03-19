/**
 * Internal linking system for blog articles.
 * 
 * Auto-injects contextual markdown links into article content
 * based on keyword→slug mappings. Max 3 links per article,
 * each target linked at most once, never links to self.
 */

interface InternalLinkEntry {
  /** Keyword phrases to match (case-insensitive, first match wins) */
  keywords: string[];
  /** Target article slug (without /blog/ prefix) */
  slug: string;
  /** Anchor text for the link */
  label: string;
}

const MAX_LINKS_PER_ARTICLE = 3;

/**
 * Keyword → URL mapping for all EN blog articles.
 * Order matters: entries higher in the list are prioritized when
 * multiple matches exist. Put broader/more-common phrases last
 * to avoid over-matching.
 */
export const INTERNAL_LINK_MAP: InternalLinkEntry[] = [
  // --- How-To Guides ---
  {
    keywords: ["turn long video into clips", "turn a long video into clips", "long video into clips"],
    slug: "turn-long-video-into-clips",
    label: "guide to turning long videos into clips",
  },
  {
    keywords: ["auto captions", "automatic captions", "add captions automatically"],
    slug: "auto-captions-for-videos",
    label: "auto captions guide",
  },
  {
    keywords: ["add subtitles automatically", "subtitles automatically", "automatic subtitles"],
    slug: "add-subtitles-to-videos-automatically",
    label: "guide to adding subtitles automatically",
  },
  {
    keywords: ["make youtube shorts from long videos", "youtube shorts from long form", "make youtube shorts"],
    slug: "youtube-shorts-from-long-form",
    label: "YouTube Shorts from long-form guide",
  },
  {
    keywords: ["repurpose podcast into clips", "podcast into clips", "podcast episodes into short clips"],
    slug: "repurpose-podcast-into-clips",
    label: "podcast clipping guide",
  },
  {
    keywords: ["instagram reels from long videos", "make instagram reels", "reels from long videos"],
    slug: "make-instagram-reels-from-long-videos",
    label: "Instagram Reels guide",
  },
  {
    keywords: ["caption styles for tiktok", "best caption styles", "tiktok caption styles"],
    slug: "best-caption-styles-for-tiktok",
    label: "TikTok caption styles guide",
  },
  {
    keywords: ["resize video for tiktok", "resize videos for tiktok", "9:16 video"],
    slug: "resize-video-for-tiktok-reels-shorts",
    label: "video resizing guide",
  },
  {
    keywords: ["create highlight reel", "highlight reel from long video", "highlight reel"],
    slug: "create-highlight-reel-from-long-video",
    label: "highlight reel guide",
  },
  {
    keywords: ["use ai to create content faster", "ai content creation workflow", "ai tools for content"],
    slug: "use-ai-to-create-content-faster",
    label: "AI content creation workflow guide",
  },

  // --- Strategy ---
  {
    keywords: ["go viral on tiktok", "viral on tiktok with long-form", "viral on tiktok"],
    slug: "go-viral-on-tiktok-with-long-form-content",
    label: "TikTok virality strategy",
  },
  {
    keywords: ["repurpose webinar", "webinar into social media", "repurposing webinars"],
    slug: "repurpose-webinar-into-social-media-clips",
    label: "webinar repurposing guide",
  },
  {
    keywords: ["content repurposing system", "repurposing system on autopilot", "repurposing system"],
    slug: "content-repurposing-system-autopilot",
    label: "content repurposing system guide",
  },
  {
    keywords: ["best time to post", "best times to post", "optimal posting times"],
    slug: "best-time-to-post-on-tiktok-reels-shorts-2026",
    label: "best posting times guide",
  },
  {
    keywords: ["grow youtube channel with short-form", "grow youtube channel with shorts", "youtube channel growth"],
    slug: "grow-youtube-channel-with-short-form-content",
    label: "YouTube channel growth strategy",
  },
  {
    keywords: ["video content strategy for coaches", "coaches and course creators", "coaching content strategy"],
    slug: "video-content-strategy-coaches-course-creators",
    label: "video strategy for coaches guide",
  },
  {
    keywords: ["turn live stream into", "live stream into clips", "repurpose live stream"],
    slug: "turn-live-stream-into-viral-clips",
    label: "live stream clipping guide",
  },
  {
    keywords: ["short-form video marketing saas", "saas video marketing", "short-form video for saas"],
    slug: "short-form-video-marketing-saas",
    label: "SaaS video marketing guide",
  },
  {
    keywords: ["repurpose youtube videos", "youtube videos into multiple formats", "repurpose youtube"],
    slug: "repurpose-youtube-videos-multiple-formats",
    label: "YouTube repurposing guide",
  },
  {
    keywords: ["without being on camera", "without going on camera", "hate being on camera"],
    slug: "short-form-video-without-being-on-camera",
    label: "video without camera guide",
  },
  {
    keywords: ["batch create content", "batch content creation", "content batching", "bulk video production"],
    slug: "batch-create-content-video",
    label: "batch content creation guide",
  },
  {
    keywords: ["real estate agents content", "content repurposing real estate", "real estate video"],
    slug: "content-repurposing-real-estate-agents-2026",
    label: "real estate content guide",
  },
  {
    keywords: ["grow on linkedin", "linkedin video content", "linkedin video strategy"],
    slug: "grow-on-linkedin-with-video-content",
    label: "LinkedIn video strategy",
  },
  {
    keywords: ["promote online course", "video content to promote your course", "course promotion"],
    slug: "video-content-promote-online-course",
    label: "course promotion guide",
  },
  {
    keywords: ["repurpose podcast episodes into short-form video", "podcast episodes into short-form", "podcast to short-form video"],
    slug: "repurpose-podcast-episodes-short-form-video",
    label: "podcast-to-video guide",
  },
  {
    keywords: ["personal finance creators", "finance creator video strategy", "finance content strategy"],
    slug: "video-content-strategy-personal-finance-creators",
    label: "personal finance video strategy",
  },
  {
    keywords: ["fitness coaches video", "fitness coaches", "personal trainer video"],
    slug: "short-form-video-fitness-coaches",
    label: "fitness coach video guide",
  },
  {
    keywords: ["repurpose conference talk", "conference talk into content", "keynote into content"],
    slug: "repurpose-conference-talk-keynote-content",
    label: "conference talk repurposing guide",
  },
  {
    keywords: ["build personal brand", "personal brand with short-form", "personal branding with video"],
    slug: "build-personal-brand-short-form-video",
    label: "personal brand video guide",
  },
  {
    keywords: ["e-commerce brands", "ecommerce video", "product videos into clips"],
    slug: "content-repurposing-ecommerce-brands-product-videos",
    label: "e-commerce video repurposing guide",
  },
  {
    keywords: ["0 to 10,000 followers", "0 to 10k followers", "first 10,000 followers", "10,000 followers"],
    slug: "0-to-10000-followers-short-form-video",
    label: "0-to-10K followers guide",
  },
  {
    keywords: ["repurpose newsletter", "newsletter into video", "newsletter repurposing"],
    slug: "repurpose-newsletter-into-video-content",
    label: "newsletter repurposing guide",
  },
  {
    keywords: ["saas video marketing", "saas signups with video"],
    slug: "short-form-video-saas-companies-get-more-signups",
    label: "SaaS signups guide",
  },
  {
    keywords: ["repurpose testimonials", "testimonials into video", "case studies into video"],
    slug: "repurpose-testimonials-case-studies-video-content",
    label: "testimonial repurposing guide",
  },
  {
    keywords: ["video content strategy for lawyers", "law firm video", "lawyers video content"],
    slug: "video-content-strategy-lawyers-law-firms",
    label: "law firm video strategy",
  },
  {
    keywords: ["repurpose ted talk", "speaking reel into social", "ted talk into clips"],
    slug: "repurpose-ted-talk-speaking-reel-social-media",
    label: "TED talk repurposing guide",
  },
  {
    keywords: ["ai video repurposing for agencies", "agencies scale video", "agency video workflow"],
    slug: "ai-video-repurposing-for-agencies",
    label: "agency video repurposing guide",
  },

  // --- Comparison ---
  {
    keywords: ["hookcut vs opus clip", "opus clip comparison", "hookcut vs opus"],
    slug: "hookcut-vs-opus-clip",
    label: "HookCut vs Opus Clip comparison",
  },
  {
    keywords: ["tiktok vs reels vs shorts", "tiktok vs instagram reels", "which platform to focus on"],
    slug: "tiktok-vs-reels-vs-shorts-2026",
    label: "platform comparison guide",
  },
  {
    keywords: ["best ai video editing tools", "ai video editing tools 2026"],
    slug: "best-ai-video-editing-tools-2026",
    label: "AI video editing tools review",
  },

  // --- Broader / last-resort matches ---
  {
    keywords: ["why creators miss viral moments", "best moments go unseen"],
    slug: "creators-waste-best-moments",
    label: "why creators waste their best moments",
  },
  },
  {
    keywords: ["short form video nonprofit", "nonprofit video marketing", "nonprofit tiktok strategy"],
    slug: "short-form-video-nonprofit-organizations",
    label: "nonprofit short-form video guide",
  },
];

/**
 * Injects up to MAX_LINKS_PER_ARTICLE contextual markdown links
 * into the article content string.
 *
 * Rules:
 * - Never links to the current article (self-exclusion)
 * - Each target slug is linked at most once
 * - Only replaces the first occurrence of each keyword
 * - Skips matches inside existing markdown links [...](...) or headings (###)
 * - Case-insensitive matching
 */
export function injectInternalLinks(content: string, currentSlug: string): string {
  let result = content;
  let linksInserted = 0;
  const usedSlugs = new Set<string>();

  for (const entry of INTERNAL_LINK_MAP) {
    if (linksInserted >= MAX_LINKS_PER_ARTICLE) break;
    if (entry.slug === currentSlug) continue;
    if (usedSlugs.has(entry.slug)) continue;

    for (const keyword of entry.keywords) {
      if (linksInserted >= MAX_LINKS_PER_ARTICLE) break;

      // Case-insensitive search for the keyword
      const regex = new RegExp(
        // Negative lookbehind: not inside a markdown link text [...] or after (
        `(?<![\\[\\(])` +
        // The keyword itself, escaped for regex, word-boundary aware
        escapeRegex(keyword) +
        // Negative lookahead: not followed by ]( which would mean it's already a link
        `(?![\\]\\)])`,
        "i"
      );

      const match = regex.exec(result);
      if (!match) continue;

      // Skip if the match is inside a heading line (starts with #)
      const lineStart = result.lastIndexOf("\n", match.index) + 1;
      const lineContent = result.substring(lineStart, match.index);
      if (lineContent.trimStart().startsWith("#")) continue;

      // Skip if already inside a markdown link [...](...)
      const before = result.substring(Math.max(0, match.index - 200), match.index);
      if (isInsideMarkdownLink(before)) continue;

      // Replace with markdown link
      const matchedText = match[0];
      const link = `[${matchedText}](/blog/${entry.slug})`;
      result =
        result.substring(0, match.index) +
        link +
        result.substring(match.index + matchedText.length);

      usedSlugs.add(entry.slug);
      linksInserted++;
      break; // Move to next entry
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rough check: is the current position inside a markdown link's text portion?
 * Looks for an unmatched [ before the position.
 */
function isInsideMarkdownLink(textBefore: string): boolean {
  let bracketDepth = 0;
  for (let i = textBefore.length - 1; i >= 0; i--) {
    const ch = textBefore[i];
    if (ch === "]") bracketDepth++;
    if (ch === "[") {
      if (bracketDepth > 0) bracketDepth--;
      else return true; // unmatched [, we're inside a link
    }
    if (ch === "\n") break; // don't look beyond the current line
  }
  return false;
}

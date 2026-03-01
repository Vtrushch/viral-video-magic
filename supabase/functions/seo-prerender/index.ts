import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Static blog article data for pre-rendering
const BLOG_ARTICLES: Record<string, { title: string; description: string; keywords: string; date: string; readTime: string; category: string }> = {
  "turn-long-video-into-clips": {
    title: "How to Turn a 1-Hour YouTube Video into 10 Viral Clips in 15 Minutes",
    description: "Stop letting your best content collect dust. Learn how to use AI to extract 10 viral clips from any long YouTube video in under 15 minutes — no editing skills needed.",
    keywords: "turn long videos into clips, YouTube to short clips, AI video clipper, viral clips from long video",
    date: "2026-02-15",
    readTime: "8 min read",
    category: "How-To Guide",
  },
  "auto-captions-for-videos": {
    title: "How to Add Captions to Videos Automatically (Without Spending Hours Editing)",
    description: "Learn how to add professional auto-captions to your videos in minutes using AI. No manual syncing, no SRT files, no editing software — just great captions that boost views.",
    keywords: "add captions to videos automatically, auto captions video, AI subtitles generator, automatic subtitles for videos",
    date: "2026-02-20",
    readTime: "9 min read",
    category: "How-To Guide",
  },
  "hookcut-vs-opus-clip": {
    title: "HookCut vs Opus Clip: Which AI Video Clipper Is Right for You? (2026)",
    description: "Comparing HookCut and Opus Clip side-by-side in 2026. Features, pricing, caption quality, ease of use, and which one is better for your content workflow.",
    keywords: "HookCut vs Opus Clip, Opus Clip alternative, best AI video clipper 2026, AI video clipping tool comparison",
    date: "2026-02-25",
    readTime: "10 min read",
    category: "Comparison",
  },
  "creators-waste-best-moments": {
    title: "Why 90% of Creators Waste Their Best Moments (And How to Stop)",
    description: "Most creators record hours of content but only publish a fraction. Learn why repurposing is the highest-ROI content strategy and how AI makes it effortless.",
    keywords: "content repurposing strategy, creator productivity, repurpose video content, best moments from long video",
    date: "2026-03-01",
    readTime: "7 min read",
    category: "Strategy",
  },
  "youtube-shorts-from-long-form": {
    title: "How to Make YouTube Shorts from Long-Form Videos (Step-by-Step Guide)",
    description: "Learn the exact workflow to turn your existing YouTube videos into Shorts that grow your channel. AI-powered clipping, formatting, and caption tips included.",
    keywords: "YouTube Shorts from long videos, make YouTube Shorts, repurpose for YouTube Shorts, long video to Shorts",
    date: "2026-03-05",
    readTime: "9 min read",
    category: "How-To Guide",
  },
};

function renderBlogArticleHtml(slug: string): string | null {
  const article = BLOG_ARTICLES[slug];
  if (!article) return null;

  const url = `https://hookcut.com/blog/${slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: "HookCut", url: "https://hookcut.com" },
    publisher: {
      "@type": "Organization",
      name: "HookCut",
      url: "https://hookcut.com",
      logo: { "@type": "ImageObject", url: "https://hookcut.com/og-image.svg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: article.keywords,
    image: "https://hookcut.com/og-image.svg",
    url,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${article.title} — HookCut Blog</title>
  <meta name="description" content="${article.description}" />
  <meta name="keywords" content="${article.keywords}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${article.title}" />
  <meta property="og:description" content="${article.description}" />
  <meta property="og:image" content="https://hookcut.com/og-image.svg" />
  <meta property="og:site_name" content="HookCut" />
  <meta property="article:published_time" content="${article.date}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${article.title}" />
  <meta name="twitter:description" content="${article.description}" />
  <meta name="twitter:image" content="https://hookcut.com/og-image.svg" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <h1>${article.title}</h1>
  <p>${article.description}</p>
  <p>Category: ${article.category} | ${article.readTime} | Published: ${article.date}</p>
  <a href="https://hookcut.com/blog">Back to Blog</a>
</body>
</html>`;
}

function renderBlogIndexHtml(): string {
  const articleLinks = Object.entries(BLOG_ARTICLES)
    .map(([slug, a]) => `<li><a href="https://hookcut.com/blog/${slug}">${a.title}</a> — ${a.description}</li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog — HookCut | Guides & Tips for Content Creators</title>
  <meta name="description" content="Tips, guides, and strategies for content creators. Learn how to repurpose long videos into viral short clips with AI." />
  <link rel="canonical" href="https://hookcut.com/blog" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://hookcut.com/blog" />
  <meta property="og:title" content="HookCut Blog — Guides for Content Creators" />
  <meta property="og:description" content="Tips, guides, and strategies for content creators using AI video repurposing." />
  <meta property="og:image" content="https://hookcut.com/og-image.svg" />
</head>
<body>
  <h1>HookCut Blog</h1>
  <p>Tips, guides, and strategies for content creators.</p>
  <ul>${articleLinks}</ul>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";

    // Check if requester is a crawler
    const ua = req.headers.get("user-agent") || "";
    const isCrawler = /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|whatsapp|telegram/i.test(ua);

    // If not a crawler, redirect to the real SPA
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `https://hookcut.com${path}` },
      });
    }

    let html: string | null = null;

    if (path === "/blog" || path === "/blog/") {
      html = renderBlogIndexHtml();
    } else if (path.startsWith("/blog/")) {
      const slug = path.replace("/blog/", "").replace(/\/$/, "");
      html = renderBlogArticleHtml(slug);
    }

    if (!html) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Static blog article data for pre-rendering
const BLOG_ARTICLES: Record<string, { title: string; description: string; keywords: string; date: string; readTime: string; category: string }> = {
  "turn-long-video-into-clips": {
    title: "How to Turn a Long Video into Viral Clips | HookCut",
    description: "Learn how to turn any long video into 10 viral short clips in 15 minutes using AI. Step-by-step guide for YouTube, TikTok, and Instagram Reels.",
    keywords: "turn long videos into clips, YouTube to short clips, AI video clipper, viral clips from long video",
    date: "2025-03-01",
    readTime: "8 min read",
    category: "How-To Guide",
  },
  "auto-captions-for-videos": {
    title: "How to Add Captions to Videos Automatically | HookCut",
    description: "Add professional captions to any video in minutes. 6 caption styles including Hormozi, MrBeast, Minimal. 85% of videos watched without sound.",
    keywords: "add captions to videos automatically, auto captions video, AI subtitles generator, automatic subtitles for videos",
    date: "2025-03-01",
    readTime: "9 min read",
    category: "How-To Guide",
  },
  "hookcut-vs-opus-clip": {
    title: "HookCut vs Opus Clip: Full Comparison 2025 | HookCut",
    description: "Detailed comparison of HookCut and Opus Clip. Features, pricing, caption quality, and which tool is right for your content.",
    keywords: "HookCut vs Opus Clip, Opus Clip alternative, best AI video clipper 2025, AI video clipping tool comparison",
    date: "2025-03-01",
    readTime: "10 min read",
    category: "Comparison",
  },
  "creators-waste-best-moments": {
    title: "Why Creators Waste Their Best Video Moments | HookCut",
    description: "90% of creators never repurpose their best content. Learn how to extract viral moments from long videos automatically.",
    keywords: "content repurposing strategy, creator productivity, repurpose video content, best moments from long video",
    date: "2025-03-01",
    readTime: "7 min read",
    category: "Strategy",
  },
  "youtube-shorts-from-long-form": {
    title: "How to Make YouTube Shorts from Long Videos | HookCut",
    description: "Turn long YouTube videos into Shorts automatically. AI finds the best moments, adds captions, exports in 9:16 format.",
    keywords: "YouTube Shorts from long videos, make YouTube Shorts, repurpose for YouTube Shorts, long video to Shorts",
    date: "2025-03-01",
    readTime: "9 min read",
    category: "How-To Guide",
  },
  "repurpose-podcast-into-clips": {
    title: "How to Repurpose Podcast Episodes into Short Clips (2026 Guide) | HookCut",
    description: "Turn any podcast episode into 10 viral short clips in minutes. Step-by-step guide for podcasters to grow on TikTok, Reels, and YouTube Shorts using AI in 2026.",
    keywords: "repurpose podcast clips, podcast to short clips, podcast repurposing tool, podcast clips for social media",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "make-instagram-reels-from-long-videos": {
    title: "How to Make Instagram Reels from Long Videos Automatically (2026) | HookCut",
    description: "Turn any long video into Instagram Reels automatically using AI. Step-by-step guide for creators and marketers. Best clip length, caption tips, and posting times for Reels in 2026.",
    keywords: "make instagram reels from long video, long video to reels, instagram reels from youtube, repurpose video for instagram",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "best-caption-styles-for-tiktok": {
    title: "Best Caption Styles for TikTok in 2026 (With Examples and Data) | HookCut",
    description: "The best caption styles for TikTok in 2026 ranked by engagement. Hormozi style, MrBeast style, animated captions, and more — with real data on which performs best.",
    keywords: "best caption styles tiktok, tiktok caption styles 2026, animated captions tiktok, tiktok subtitle styles, best subtitles for short videos",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "resize-video-for-tiktok-reels-shorts": {
    title: "How to Resize Videos for TikTok, Reels, and YouTube Shorts in 2026 (9:16 Guide) | HookCut",
    description: "Complete guide to resizing videos for TikTok, Instagram Reels, and YouTube Shorts in 2026. Correct dimensions, aspect ratios, file sizes, and the fastest tools to reframe automatically.",
    keywords: "resize video for tiktok reels shorts, 9:16 video format, vertical video dimensions 2026, reframe video for tiktok, video aspect ratio tiktok instagram",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "ai-video-repurposing-for-agencies": {
    title: "How Social Media Agencies Can Scale Video Content with AI in 2026 | HookCut",
    description: "Complete guide for social media agencies to scale short video production using AI in 2026. Workflows, tools, pricing, and how to deliver 10x more content without hiring.",
    keywords: "ai video repurposing for agencies, social media agency video tools, scale video content production, agency video workflow 2026, video repurposing at scale",
    date: "2026-03-01",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/convertir-video-largo-en-clips-virales": {
    title: "Cómo Convertir un Vídeo Largo en Clips Virales con IA (2026) | HookCut",
    description: "Aprende a convertir cualquier vídeo largo en 10 clips virales en 15 minutos usando IA. Guía paso a paso para YouTube, TikTok e Instagram Reels en 2026.",
    keywords: "convertir video largo en clips, clips virales de vídeos largos, recortar vídeos con IA, convertir YouTube en shorts, herramienta de clips con IA",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/subtitulos-automaticos-para-videos": {
    title: "Cómo Añadir Subtítulos Automáticos a tus Vídeos en 2026 (Guía Completa) | HookCut",
    description: "Añade subtítulos profesionales a cualquier vídeo en minutos. 6 estilos de subtítulos con IA: Hormozi, MrBeast, Minimal y más. El 85% de los vídeos se ven sin sonido.",
    keywords: "subtítulos automáticos para vídeos, añadir subtítulos a vídeo, generador de subtítulos con IA, subtítulos para TikTok, subtítulos animados 2026",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/hookcut-vs-opus-clip": {
    title: "HookCut vs Opus Clip 2026: Comparativa Completa para Creadores | HookCut",
    description: "Comparativa detallada de HookCut y Opus Clip en 2026. Precios, estilos de subtítulos, calidad de clips y cuál es mejor para tu tipo de contenido.",
    keywords: "hookcut vs opus clip, alternativa a opus clip, opus clip precio 2026, mejor herramienta de clips con IA, comparativa herramientas vídeo corto",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "Comparison",
  },
  "es/creadores-desperdician-sus-mejores-momentos": {
    title: "Por Qué los Creadores Desperdician sus Mejores Momentos de Vídeo (y Cómo Evitarlo) | HookCut",
    description: "El 90% de los creadores nunca reutiliza su mejor contenido. Aprende cómo extraer los momentos virales de tus vídeos largos automáticamente y multiplicar tu alcance.",
    keywords: "reutilizar contenido de vídeo, repurposing de contenido, aprovechar vídeos largos, momentos virales de vídeo, estrategia de contenido 2026",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "Strategy",
  },
  "es/crear-youtube-shorts-de-videos-largos": {
    title: "Cómo Crear YouTube Shorts a partir de Vídeos Largos Automáticamente (2026) | HookCut",
    description: "Convierte tus vídeos largos de YouTube en Shorts automáticamente con IA. Guía completa sobre formato, algoritmo, monetización y las mejores herramientas en 2026.",
    keywords: "crear youtube shorts de videos largos, youtube shorts automático, convertir youtube a shorts, herramienta youtube shorts IA, shorts desde vídeos largos 2026",
    date: "2026-03-01",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/reutilizar-episodios-de-podcast-en-clips": {
    title: "Cómo Reutilizar Episodios de Podcast en Clips Cortos (Guía 2026) | HookCut",
    description: "Convierte cualquier episodio de podcast en 10 clips virales en minutos. Guía paso a paso para podcasters que quieren crecer en TikTok, Reels y YouTube Shorts en 2026.",
    keywords: "reutilizar episodios de podcast en clips, podcast a clips cortos, clips de podcast para redes sociales, herramienta clips podcast, convertir podcast en vídeo corto",
    date: "2026-03-06",
    readTime: "10 min read",
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
    author: { "@type": "Organization", name: "HookCut Team", url: "https://hookcut.com" },
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
  <title>${article.title}</title>
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

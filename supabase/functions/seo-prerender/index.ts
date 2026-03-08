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
  "go-viral-on-tiktok-with-long-form-content": {
    title: "How to Go Viral on TikTok with Long-Form Content (2026 Strategy) | HookCut",
    description: "Turn your long-form videos into TikTok clips that actually go viral. Proven 2026 strategy for YouTubers, podcasters, and course creators to grow on TikTok fast.",
    keywords: "go viral on tiktok with long form content, tiktok growth strategy 2026, tiktok for content creators, repurpose content for tiktok",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
  "best-ai-video-editing-tools-2026": {
    title: "Best AI Video Editing Tools for Content Creators in 2026 (Honest Review) | HookCut",
    description: "The best AI video editing tools for content creators in 2026 — ranked by use case, price, and actual performance. From clip finders to caption generators to full editors.",
    keywords: "best ai video editing tools 2026, ai video editor 2026, best video editing software creators, ai clip generator, automatic video editor",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Comparison",
  },
  "repurpose-webinar-into-social-media-clips": {
    title: "How to Repurpose Webinars into Social Media Content (2026 Complete Guide) | HookCut",
    description: "Turn any webinar recording into weeks of social media content. Step-by-step guide for marketers and B2B creators to repurpose webinars into clips, posts, and Shorts in 2026.",
    keywords: "repurpose webinar into social media clips, webinar repurposing 2026, webinar to social media, convert webinar to clips, webinar content strategy",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "face-tracking-vertical-video": {
    title: "Face Tracking for Vertical Video: Why It Matters and How It Works (2026) | HookCut",
    description: "Face tracking automatically keeps speakers centered in vertical 9:16 video. Learn how AI face tracking works, why it's essential for short-form content, and which tools do it best in 2026.",
    keywords: "face tracking vertical video, ai face tracking video, auto reframe video, vertical video face tracking, 9:16 reframe ai",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "content-repurposing-system-autopilot": {
    title: "How to Build a Content Repurposing System That Runs on Autopilot (2026) | HookCut",
    description: "Build a content repurposing system that automatically turns your long-form content into short clips every week — with minimal manual work. Complete 2026 framework for creators and teams.",
    keywords: "content repurposing system, automate content repurposing, content repurposing workflow, repurpose content at scale, content system for creators 2026",
    date: "2026-03-08",
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
  "es/crear-instagram-reels-de-videos-largos": {
    title: "Cómo Crear Instagram Reels a partir de Vídeos Largos Automáticamente (2026) | HookCut",
    description: "Convierte cualquier vídeo largo en Instagram Reels automáticamente con IA. Duración óptima, estilos de subtítulos, horarios de publicación y herramientas para Reels en 2026.",
    keywords: "crear instagram reels de videos largos, vídeo largo a reels, instagram reels automático, reutilizar vídeo para instagram, generador de reels con IA",
    date: "2026-03-06",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/mejores-estilos-de-subtitulos-para-tiktok": {
    title: "Los Mejores Estilos de Subtítulos para TikTok en 2026 (Con Datos y Ejemplos) | HookCut",
    description: "Los mejores estilos de subtítulos para TikTok en 2026 ordenados por engagement. Estilo Hormozi, MrBeast, Minimal, Neon y más — con datos reales sobre cuál rinde mejor.",
    keywords: "mejores estilos de subtítulos para TikTok, estilos de subtítulos TikTok 2026, subtítulos animados TikTok, tipos de subtítulos vídeo corto, subtítulos para videos virales",
    date: "2026-03-06",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/redimensionar-video-para-tiktok-reels-shorts": {
    title: "Cómo Redimensionar Vídeos para TikTok, Reels y YouTube Shorts en 2026 (Guía 9:16) | HookCut",
    description: "Guía completa para redimensionar vídeos para TikTok, Instagram Reels y YouTube Shorts en 2026. Dimensiones correctas, relaciones de aspecto, tamaños de archivo y herramientas automáticas.",
    keywords: "redimensionar video para TikTok Reels Shorts, formato de vídeo 9:16, dimensiones vídeo vertical 2026, reformatear vídeo para TikTok, relación de aspecto vídeo TikTok Instagram",
    date: "2026-03-06",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/agencias-escalar-contenido-video-con-ia": {
    title: "Cómo las Agencias de Redes Sociales Pueden Escalar Contenido de Vídeo con IA en 2026 | HookCut",
    description: "Guía completa para agencias de redes sociales que quieren escalar la producción de vídeo corto con IA en 2026. Flujos de trabajo, herramientas, precios y cómo entregar 10x más contenido sin contratar.",
    keywords: "agencias escalar contenido video con IA, herramientas de vídeo para agencias, escalar producción de vídeo, flujo de trabajo de agencia 2026, reutilización de vídeo a escala",
    date: "2026-03-06",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/como-hacerse-viral-en-tiktok-con-contenido-largo": {
    title: "Cómo Hacerse Viral en TikTok con Contenido Largo (Estrategia 2026) | HookCut",
    description: "Convierte tus vídeos largos en clips de TikTok que realmente se vuelven virales. Estrategia probada 2026 para YouTubers, podcasters y creadores de cursos que quieren crecer en TikTok.",
    keywords: "hacerse viral en tiktok con contenido largo, estrategia tiktok 2026, tiktok para creadores, reutilizar contenido para tiktok, algoritmo tiktok 2026",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
  "es/mejores-herramientas-edicion-video-ia-2026": {
    title: "Las Mejores Herramientas de Edición de Vídeo con IA para Creadores en 2026 (Análisis Honesto) | HookCut",
    description: "Las mejores herramientas de edición de vídeo con IA para creadores en 2026 — clasificadas por caso de uso, precio y rendimiento real. Desde detectores de clips hasta generadores de subtítulos y editores completos.",
    keywords: "mejores herramientas edicion video ia 2026, editor de vídeo ia 2026, mejor software edición vídeo creadores, generador clips ia, editor de vídeo automático",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Comparison",
  },
  "es/reutilizar-webinar-en-contenido-redes-sociales": {
    title: "Cómo Reutilizar Webinars en Contenido para Redes Sociales (Guía Completa 2026) | HookCut",
    description: "Convierte cualquier grabación de webinar en semanas de contenido para redes sociales. Guía paso a paso para marketers y creadores B2B para reutilizar webinars en clips, posts y Shorts en 2026.",
    keywords: "reutilizar webinar en contenido redes sociales, reutilización de webinar 2026, webinar a redes sociales, convertir webinar en clips, estrategia de contenido webinar",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/seguimiento-facial-video-vertical": {
    title: "Seguimiento Facial para Vídeo Vertical: Por Qué Importa y Cómo Funciona (2026) | HookCut",
    description: "El seguimiento facial mantiene automáticamente a los hablantes centrados en vídeo vertical 9:16. Aprende cómo funciona el seguimiento facial con IA, por qué es esencial para el contenido de formato corto y qué herramientas lo hacen mejor en 2026.",
    keywords: "seguimiento facial video vertical, seguimiento facial ia vídeo, reencuadre automático vídeo, seguimiento facial vídeo vertical, reencuadre 9:16 ia",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/sistema-reutilizacion-contenido-automatico": {
    title: "Cómo Construir un Sistema de Reutilización de Contenido que Funcione Solo (2026) | HookCut",
    description: "Construye un sistema de reutilización de contenido que convierte automáticamente tu contenido largo en clips cortos cada semana — con mínimo trabajo manual. Framework completo 2026 para creadores y equipos.",
    keywords: "sistema reutilizacion contenido automatico, automatizar reutilización de contenido, flujo de trabajo reutilización contenido, reutilizar contenido a escala, sistema de contenido para creadores 2026",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "create-highlight-reel-from-long-video": {
    title: "How to Create a Highlight Reel from Long Videos (2026 Guide) | HookCut",
    description: "Create a professional highlight reel from any long video in minutes using AI. Step-by-step guide for podcasters, YouTubers, and event creators — with tips on music, pacing, and distribution in 2026.",
    keywords: "create highlight reel from long video, highlight reel maker 2026, best moments compilation, ai highlight reel, video highlight generator",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "best-time-to-post-on-tiktok-reels-shorts-2026": {
    title: "Best Time to Post on TikTok, Reels and YouTube Shorts in 2026 (Data-Backed Guide) | HookCut",
    description: "The best times to post on TikTok, Instagram Reels, and YouTube Shorts in 2026 — backed by platform data. Includes day-by-day breakdown, timezone tips, and how to find your own optimal posting times.",
    keywords: "best time to post on tiktok reels shorts 2026, best time post tiktok 2026, when to post instagram reels, best posting time youtube shorts, optimal posting schedule social media 2026",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "grow-youtube-channel-with-short-form-content": {
    title: "How to Grow a YouTube Channel with Short-Form Content in 2026 | HookCut",
    description: "Use YouTube Shorts to grow your main YouTube channel in 2026. Proven strategy for converting Shorts viewers into long-form subscribers — with clip selection, title optimization, and cross-promotion tactics.",
    keywords: "grow youtube channel with short form content, youtube shorts growth strategy 2026, grow youtube with shorts, youtube shorts to long form, shorts channel growth 2026",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
  "video-content-strategy-coaches-course-creators": {
    title: "Video Content Strategy for Coaches and Course Creators in 2026 (Complete Guide) | HookCut",
    description: "The complete video content strategy for coaches and course creators in 2026. How to repurpose your expertise into short-form clips that attract clients, build authority, and grow your audience on autopilot.",
    keywords: "video content strategy coaches course creators, content strategy for coaches 2026, video marketing for course creators, short form content for coaches, coach content repurposing",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "turn-live-stream-into-viral-clips": {
    title: "How to Turn a Live Stream into Viral Clips (2026 Complete Guide) | HookCut",
    description: "Turn any live stream recording into viral TikTok, Reels, and YouTube Shorts clips in 2026. Step-by-step guide for Twitch streamers, YouTube Live creators, and Instagram Live hosts.",
    keywords: "turn live stream into clips, live stream to clips 2026, repurpose twitch stream, clip live stream for tiktok, livestream highlight clips",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/crear-highlight-reel-de-videos-largos": {
    title: "Cómo Crear un Highlight Reel a partir de Vídeos Largos (Guía 2026) | HookCut",
    description: "Crea un highlight reel profesional a partir de cualquier vídeo largo en minutos usando IA. Guía paso a paso para podcasters, YouTubers y creadores de eventos — con consejos sobre música, ritmo y distribución en 2026.",
    keywords: "crear highlight reel de videos largos, generador de highlight reel 2026, compilación mejores momentos, highlight reel con ia, generador de highlights de vídeo",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/mejor-hora-publicar-tiktok-reels-shorts-2026": {
    title: "La Mejor Hora para Publicar en TikTok, Reels y YouTube Shorts en 2026 (Guía con Datos) | HookCut",
    description: "Las mejores horas para publicar en TikTok, Instagram Reels y YouTube Shorts en 2026 — basadas en datos de las plataformas. Incluye desglose día a día, consejos de zona horaria y cómo encontrar tus propios horarios óptimos.",
    keywords: "mejor hora publicar tiktok reels shorts 2026, mejor hora publicar tiktok 2026, cuándo publicar instagram reels, mejor hora publicar youtube shorts, horario óptimo redes sociales 2026",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/crecer-canal-youtube-con-contenido-corto": {
    title: "Cómo Hacer Crecer tu Canal de YouTube con Contenido de Formato Corto en 2026 | HookCut",
    description: "Usa YouTube Shorts para hacer crecer tu canal principal de YouTube en 2026. Estrategia probada para convertir espectadores de Shorts en suscriptores de contenido largo — con selección de clips, optimización de títulos y tácticas de promoción cruzada.",
    keywords: "crecer canal youtube contenido corto, estrategia de crecimiento youtube shorts 2026, crecer youtube con shorts, youtube shorts a contenido largo, crecimiento canal shorts 2026",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
  "es/estrategia-contenido-video-coaches-creadores-cursos": {
    title: "Estrategia de Contenido de Vídeo para Coaches y Creadores de Cursos en 2026 (Guía Completa) | HookCut",
    description: "La estrategia completa de contenido de vídeo para coaches y creadores de cursos en 2026. Cómo reutilizar tu experiencia en clips de formato corto que atraen clientes, construyen autoridad y hacen crecer tu audiencia en piloto automático.",
    keywords: "estrategia contenido video coaches creadores cursos, estrategia de contenido para coaches 2026, marketing de vídeo para creadores de cursos, contenido de formato corto para coaches, reutilización de contenido para coaches",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/convertir-stream-en-directo-en-clips-virales": {
    title: "Cómo Convertir un Stream en Directo en Clips Virales (Guía Completa 2026) | HookCut",
    description: "Convierte cualquier grabación de stream en directo en clips virales para TikTok, Reels y YouTube Shorts en 2026. Guía paso a paso para streamers de Twitch, YouTube Live e Instagram Live.",
    keywords: "convertir stream en directo en clips virales, clips de stream 2026, reutilizar stream de twitch, clips de directo para tiktok, highlights de livestream",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "add-subtitles-to-videos-automatically": {
    title: "How to Add Subtitles to Videos Automatically in 2026 (Complete Guide) | HookCut",
    description: "Add subtitles to any video automatically in 2026 using AI. Covers accuracy, caption styles, positioning, burned-in vs soft subs, and the best tools for TikTok, Reels, and YouTube Shorts.",
    keywords: "add subtitles to videos automatically, automatic subtitles video 2026, ai captions video, auto caption generator, burned in subtitles video",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "short-form-video-marketing-saas": {
    title: "Short-Form Video Marketing Strategy for SaaS Companies in 2026 | HookCut",
    description: "How SaaS companies use short-form video to drive trials, reduce churn, and build brand authority in 2026. Complete strategy for B2B SaaS marketing teams and solo founders.",
    keywords: "short form video marketing saas, saas video marketing 2026, b2b short form video, saas content strategy video, tiktok for saas companies",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "repurpose-youtube-videos-multiple-formats": {
    title: "How to Repurpose YouTube Videos into Multiple Content Formats in 2026 | HookCut",
    description: "Turn one YouTube video into 10+ pieces of content across every platform. Complete 2026 guide to repurposing YouTube videos into clips, blog posts, newsletters, carousels, and more.",
    keywords: "repurpose youtube videos multiple formats, repurpose youtube video 2026, youtube video to multiple content, content repurposing youtube, turn youtube video into blog post",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "viral-score-ai-video": {
    title: "Viral Score: What It Is and How AI Predicts Viral Video Content (2026) | HookCut",
    description: "What is a viral score for video? How AI tools analyze your clips and predict which moments will go viral in 2026. Includes what signals matter, how accurate predictions are, and how to use viral scoring in your workflow.",
    keywords: "viral score ai video, viral score video, ai viral prediction, how to predict viral content, viral video ai tool 2026",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "short-form-video-without-showing-face": {
    title: "How to Create Short-Form Video Content Without Showing Your Face (2026 Guide) | HookCut",
    description: "Build a successful short-form video presence on TikTok, Reels, and YouTube Shorts without showing your face. 10 proven formats, tools, and strategies for faceless video creators in 2026.",
    keywords: "short form video without showing face, faceless youtube channel 2026, tiktok without showing face, short form video no face, anonymous content creator strategy",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/agregar-subtitulos-a-videos-automaticamente": {
    title: "Cómo Agregar Subtítulos a Vídeos Automáticamente en 2026 (Guía Completa) | HookCut",
    description: "Agrega subtítulos a cualquier vídeo automáticamente en 2026 usando IA. Cubre precisión, estilos de subtítulos, posicionamiento, subs quemados vs suaves y las mejores herramientas para TikTok, Reels y YouTube Shorts.",
    keywords: "agregar subtítulos a videos automáticamente, subtítulos automáticos vídeo 2026, subtítulos ia vídeo, generador de subtítulos automático, subtítulos quemados en vídeo",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/marketing-video-formato-corto-saas": {
    title: "Estrategia de Marketing con Vídeo de Formato Corto para Empresas SaaS en 2026 | HookCut",
    description: "Cómo las empresas SaaS usan el vídeo de formato corto para impulsar pruebas, reducir la rotación y construir autoridad de marca en 2026. Estrategia completa para equipos de marketing B2B SaaS y fundadores en solitario.",
    keywords: "marketing video formato corto saas, marketing de vídeo saas 2026, vídeo de formato corto b2b, estrategia de contenido saas vídeo, tiktok para empresas saas",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/reutilizar-videos-youtube-multiples-formatos": {
    title: "Cómo Reutilizar Vídeos de YouTube en Múltiples Formatos de Contenido en 2026 | HookCut",
    description: "Convierte un vídeo de YouTube en 10+ piezas de contenido en todas las plataformas. Guía completa 2026 para reutilizar vídeos de YouTube en clips, posts de blog, newsletters, carruseles y más.",
    keywords: "reutilizar videos youtube multiples formatos, reutilizar vídeo de youtube 2026, youtube vídeo a múltiple contenido, reutilización de contenido youtube, convertir vídeo de youtube en post de blog",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "es/puntuacion-viral-ia-video": {
    title: "Puntuación Viral: Qué Es y Cómo la IA Predice el Contenido de Vídeo Viral (2026) | HookCut",
    description: "¿Qué es una puntuación viral para vídeo? Cómo las herramientas de IA analizan tus clips y predicen qué momentos se volverán virales en 2026. Incluye qué señales importan y cómo usarla en tu flujo de trabajo.",
    keywords: "puntuación viral ia video, puntuación viral vídeo, predicción viral ia, cómo predecir contenido viral, herramienta ia vídeo viral 2026",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "How-To Guide",
  },
  "es/videos-formato-corto-sin-mostrar-cara": {
    title: "Cómo Crear Contenido de Vídeo de Formato Corto Sin Mostrar tu Cara (Guía 2026) | HookCut",
    description: "Construye una presencia exitosa de vídeo de formato corto en TikTok, Reels y YouTube Shorts sin mostrar tu cara. 10 formatos probados, herramientas y estrategias para creadores faceless en 2026.",
    keywords: "videos formato corto sin mostrar cara, canal de youtube faceless 2026, tiktok sin mostrar la cara, vídeo de formato corto sin cara, estrategia de creador anónimo",
    date: "2026-03-08",
    readTime: "11 min read",
    category: "Strategy",
  },
  "batch-create-content-video": {
    title: "How to Batch Create Content: The Creator's Guide to Bulk Video Production (2026) | HookCut",
    description: "Batch content creation lets you produce weeks of video in a single session. Complete guide to bulk video production for creators in 2026 — including schedules, tools, and the exact workflow used by full-time creators.",
    keywords: "batch create content video, batch content creation 2026, bulk video production creator, content batching strategy, how to batch record videos",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
  "content-repurposing-real-estate-agents": {
    title: "Content Repurposing for Real Estate Agents: The Complete 2026 Guide | HookCut",
    description: "Real estate agents are leaving massive reach on the table. Learn how to repurpose property tours, market updates, and client Q&As into TikTok, Reels, and YouTube Shorts that generate leads in 2026.",
    keywords: "content repurposing real estate agents, real estate video content 2026, realtor tiktok strategy, real estate short form video, real estate social media content",
    date: "2026-03-08",
    readTime: "10 min read",
    category: "Strategy",
  },
};

const COMPARISON_PAGES: Record<string, { title: string; description: string; keywords: string }> = {
  "opus-clip": {
    title: "HookCut vs Opus Clip 2026: Full Comparison | HookCut",
    description: "HookCut vs Opus Clip 2026. 40% cheaper, no clip expiry, better caption styles. See why creators are switching.",
    keywords: "hookcut vs opus clip, opus clip alternative, ai video clipper comparison 2026",
  },
  vizard: {
    title: "HookCut vs Vizard 2026: Which AI Clipper Wins? | HookCut",
    description: "HookCut vs Vizard 2026. Better for solo creators: simpler workflow, more caption styles, $21/mo cheaper.",
    keywords: "hookcut vs vizard, vizard alternative, ai video clipper comparison 2026",
  },
  descript: {
    title: "HookCut vs Descript 2026: Auto Clips vs Manual Editing | HookCut",
    description: "HookCut vs Descript 2026. HookCut finds your best moments automatically. Descript requires manual selection.",
    keywords: "hookcut vs descript, descript alternative, ai clip detection vs manual editing",
  },
  kapwing: {
    title: "HookCut vs Kapwing 2026: AI Auto-Clips vs Manual Editing",
    description: "HookCut vs Kapwing 2026. HookCut finds your best moments automatically. Kapwing requires manual work. 10x faster.",
    keywords: "hookcut vs kapwing, kapwing alternative, ai video clipper vs manual editor 2026",
  },
  munch: {
    title: "HookCut vs Munch 2026: Creator Tool vs Marketing Platform",
    description: "HookCut vs Munch 2026. Same AI clip quality, 60% cheaper. HookCut is built for creators, Munch for marketing teams.",
    keywords: "hookcut vs munch, munch alternative, ai clip tool for creators 2026",
  },
  submagic: {
    title: "HookCut vs Submagic 2026: Full Workflow vs Captions Only",
    description: "HookCut vs Submagic 2026. HookCut finds clips AND adds captions for $9. Submagic only does captions for $30.",
    keywords: "hookcut vs submagic, submagic alternative, ai captions vs full clip workflow 2026",
  },
  "vidyo-ai": {
    title: "HookCut vs Vidyo.ai (Quso) 2026: 80% Cheaper | HookCut",
    description: "HookCut vs Vidyo.ai 2026. Get the same AI video clipping at $9 vs $49. Full feature and pricing comparison.",
    keywords: "hookcut vs vidyo ai, hookcut vs quso, vidyo ai alternative, ai video clipper 2026",
  },
  "exemplary-ai": {
    title: "HookCut vs Exemplary AI 2026: Clips vs Transcripts | HookCut",
    description: "HookCut vs Exemplary AI 2026. HookCut optimizes for viral potential. Exemplary focuses on transcription.",
    keywords: "hookcut vs exemplary ai, exemplary ai alternative, ai clip vs transcription tool 2026",
  },
  klap: {
    title: "HookCut vs Klap 2026: All Platforms vs TikTok Only | HookCut",
    description: "HookCut vs Klap 2026. HookCut works for TikTok, Reels AND Shorts. $20 cheaper. No cancellation issues.",
    keywords: "hookcut vs klap, klap alternative, ai video clipper all platforms 2026",
  },
  "recast-studio": {
    title: "HookCut vs Recast Studio 2026: Beyond Podcasts | HookCut",
    description: "HookCut vs Recast Studio 2026. Works for any video type, not just podcasts. AI finds your best moments automatically.",
    keywords: "hookcut vs recast studio, recast studio alternative, ai video clipper vs podcast tool 2026",
  },
  capcut: {
    title: "HookCut vs CapCut 2026: Automatic vs Manual Clipping | HookCut",
    description: "HookCut vs CapCut 2026. HookCut finds your viral moments automatically. CapCut requires manual editing. 10x faster.",
    keywords: "hookcut vs capcut, capcut alternative, ai clip detection vs manual editing 2026",
  },
  canva: {
    title: "HookCut vs Canva Video 2026: AI Clips vs Design Tool | HookCut",
    description: "HookCut vs Canva 2026. HookCut uses AI to find viral moments from long videos. Canva is a design tool, not a clip finder.",
    keywords: "hookcut vs canva video, canva alternative for clips, ai video clipper vs design tool 2026",
  },
};

function renderComparisonHtml(slug: string): string | null {
  const page = COMPARISON_PAGES[slug];
  if (!page) return null;
  const url = `https://hookcut.com/vs/${slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    datePublished: "2026-03-08",
    dateModified: "2026-03-08",
    author: { "@type": "Organization", name: "HookCut Team", url: "https://hookcut.com" },
    publisher: { "@type": "Organization", name: "HookCut", url: "https://hookcut.com", logo: { "@type": "ImageObject", url: "https://hookcut.com/og-image.svg" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: page.keywords,
    image: "https://hookcut.com/og-image.svg",
    url,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />
  <meta name="keywords" content="${page.keywords}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:image" content="https://hookcut.com/og-image.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <h1>${page.title}</h1>
  <p>${page.description}</p>
  <a href="https://hookcut.com">Back to HookCut</a>
</body>
</html>`;
}

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
    } else if (path.startsWith("/vs/")) {
      const slug = path.replace("/vs/", "").replace(/\/$/, "");
      html = renderComparisonHtml(slug);
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

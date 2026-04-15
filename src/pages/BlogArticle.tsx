import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BLOG_ARTICLES } from "@/constants/blogArticles";
import { ArrowLeft, Clock } from "lucide-react";
import { injectInternalLinks } from "@/lib/internalLinks";
import { UARelatedArticles } from "@/components/UARelatedArticles";
import { ENRelatedArticles } from "@/components/ENRelatedArticles";
import { ESRelatedArticles } from "@/components/ESRelatedArticles";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t } = useTranslation();

  // Construct the full slug including es/ or ua/ prefix if on localized route
  const isEsRoute = location.pathname.startsWith("/blog/es/");
  const isUaRoute = location.pathname.startsWith("/blog/ua/");
  const fullSlug = isEsRoute ? `es/${slug}` : isUaRoute ? `ua/${slug}` : slug;

  const article = BLOG_ARTICLES.find((a) => a.slug === fullSlug);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} — HookCut Blog`;
    }
    return () => {
      document.title = "HookCut — AI Video Repurposing for Creators";
    };
  }, [article]);

  // Inject contextual internal links (EN and UA articles, memoized)
  const enrichedContent = useMemo(() => {
    if (!article) return "";
    return injectInternalLinks(article.content, article.slug);
  }, [article]);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const canonicalUrl = `https://hookcut.com/blog/${article.slug}`;
  const articleLang = article.lang || "en";

  const isEnArticle = !isUaRoute && !isEsRoute;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `https://hookcut.com/blog/${article.slug}#article`,
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.date ? `${article.date}T00:00:00Z` : "2026-03-29T00:00:00Z",
    dateModified: article.date ? `${article.date}T00:00:00Z` : "2026-04-14T00:00:00Z",
    inLanguage: articleLang === "en" ? "en-US" : articleLang,
    author: {
      "@type": "Organization",
      "@id": "https://hookcut.com/#organization",
      name: "HookCut Team",
    },
    publisher: {
      "@id": "https://hookcut.com/#organization",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isPartOf: {
      "@type": "Blog",
      "@id": "https://hookcut.com/blog",
      name: "HookCut Blog",
      publisher: { "@id": "https://hookcut.com/#organization" },
    },
    about: {
      "@type": "Thing",
      name: isUaRoute
        ? "Перепакування відео та короткий відеоконтент"
        : isEsRoute
          ? "Reutilización de vídeo y contenido de formato corto"
          : "Video repurposing and short-form video content",
    },
    mentions: { "@id": "https://hookcut.com/#software" },
    image: {
      "@type": "ImageObject",
      url: `https://hookcut.com/og/blog/${article.slug}.png`,
      width: 1200,
      height: 630,
    },
    keywords: article.keywords.join(", "),
    url: canonicalUrl,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isUaRoute ? "HookCut" : "Home", item: "https://hookcut.com" },
      { "@type": "ListItem", position: 2, name: isUaRoute ? "Блог" : isEsRoute ? "Blog" : "Blog", item: "https://hookcut.com/blog" },
      { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl },
    ],
  };

  // Contextual FAQ schema — gives AI models Q&A pairs to cite
  const articleFaqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: isUaRoute
          ? `Як HookCut допомагає з "${article.title.slice(0, 80)}"?`
          : isEsRoute
            ? `¿Cómo ayuda HookCut con "${article.title.slice(0, 80)}"?`
            : `How does HookCut help with "${article.title.slice(0, 80)}"?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: article.metaDescription,
        },
      },
      {
        "@type": "Question",
        name: isUaRoute
          ? "Скільки коштує HookCut?"
          : isEsRoute
            ? "¿Cuánto cuesta HookCut?"
            : "How much does HookCut cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isUaRoute
            ? "HookCut має безкоштовний план (3 кліпи, без кредитної картки), Starter $9/місяць та Pro $19/місяць. Оплата за кліп — ви платите лише за кліпи, які зберігаєте."
            : isEsRoute
              ? "HookCut tiene un plan gratuito (3 clips, sin tarjeta de crédito), Starter $9/mes y Pro $19/mes. Pago por clip — solo pagas por los clips que conservas."
              : "HookCut has a free plan (3 clips, no credit card required), Starter at $9/month, and Pro at $19/month. Per-clip pricing means you only pay for clips you keep.",
        },
      },
      {
        "@type": "Question",
        name: isUaRoute
          ? "Як швидко HookCut обробляє відео?"
          : isEsRoute
            ? "¿Cuánto tarda HookCut en procesar un vídeo?"
            : "How long does HookCut take to process a video?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isUaRoute
            ? "60-хвилинне відео обробляється за 10–20 хвилин. HookCut надсилає сповіщення коли обробка завершена."
            : isEsRoute
              ? "Un vídeo de 60 minutos se procesa en 10–20 minutos. HookCut envía una notificación cuando está listo."
              : "A 60-minute video takes 10–20 minutes to process. HookCut sends a notification when processing is complete.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <html lang={articleLang === "uk" ? "uk" : articleLang} />
        <title>{`${article.title} — HookCut Blog`}</title>
        <meta name="description" content={article.metaDescription} />
        <meta name="keywords" content={article.keywords.join(", ")} />
        <link rel="canonical" href={canonicalUrl} />

        {article.hreflang?.map((hl) => (
          <link key={hl.lang} rel="alternate" hrefLang={hl.lang} href={hl.href} />
        ))}

        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.metaDescription} />
        <meta property="og:image" content={`https://hookcut.com/og/blog/${article.slug}.png`} />
        <meta property="og:site_name" content="HookCut" />
        <meta property="og:locale" content={isUaRoute ? "uk_UA" : isEsRoute ? "es_ES" : "en_US"} />
        <meta property="article:published_time" content={article.date ? `${article.date}T00:00:00Z` : "2026-03-29T00:00:00Z"} />
        <meta property="article:modified_time" content={article.date ? `${article.date}T00:00:00Z` : "2026-04-14T00:00:00Z"} />
        <meta property="article:author" content="HookCut Team" />
        <meta property="article:section" content={isUaRoute ? "Відеомаркетинг" : isEsRoute ? "Marketing de Vídeo" : "Video Marketing"} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.metaDescription} />
        <meta name="twitter:image" content={`https://hookcut.com/og/blog/${article.slug}.png`} />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        <script type="application/ld+json">{JSON.stringify(articleFaqLd)}</script>
      </Helmet>

      <Navbar />

      <main className="pt-28 pb-20">
        <article className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('landing.blog.backToBlog', 'Back to Blog')}
          </Link>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{article.category}</span>
            {article.lang && (
              <>
                <span>·</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase text-xs">{article.lang}</span>
              </>
            )}
            <span>·</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readTime}</span>
            <span>·</span>
            <span>{article.date}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">
            {article.title}
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
            <ReactMarkdown>{enrichedContent}</ReactMarkdown>
          </div>

          {isUaRoute && slug && (
            <UARelatedArticles currentSlug={slug} />
          )}
          {!isUaRoute && !isEsRoute && slug && (
            <ENRelatedArticles currentSlug={slug} />
          )}
          {isEsRoute && slug && (
            <ESRelatedArticles currentSlug={slug} />
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;

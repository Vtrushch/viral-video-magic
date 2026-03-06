import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BLOG_ARTICLES } from "@/constants/blogArticles";
import { ArrowLeft, Clock } from "lucide-react";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t } = useTranslation();

  // Construct the full slug including es/ prefix if on /blog/es/ route
  const isEsRoute = location.pathname.startsWith("/blog/es/");
  const fullSlug = isEsRoute ? `es/${slug}` : slug;

  const article = BLOG_ARTICLES.find((a) => a.slug === fullSlug);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} — HookCut Blog`;
    }
    return () => {
      document.title = "HookCut — AI Video Repurposing for Creators";
    };
  }, [article]);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const canonicalUrl = `https://hookcut.com/blog/${article.slug}`;
  const articleLang = article.lang || "en";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: articleLang,
    author: {
      "@type": "Organization",
      name: "HookCut Team",
      url: "https://hookcut.com",
    },
    publisher: {
      "@type": "Organization",
      name: "HookCut",
      url: "https://hookcut.com",
      logo: {
        "@type": "ImageObject",
        url: "https://hookcut.com/og-image.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    keywords: article.keywords.join(", "),
    image: "https://hookcut.com/og-image.svg",
    url: canonicalUrl,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <html lang={articleLang} />
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
        <meta property="og:image" content="https://hookcut.com/og-image.svg" />
        <meta property="og:site_name" content="HookCut" />
        <meta property="article:published_time" content={article.date} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.metaDescription} />
        <meta name="twitter:image" content="https://hookcut.com/og-image.svg" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;

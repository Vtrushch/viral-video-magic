import { useState, useMemo } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BLOG_ARTICLES, BLOG_CATEGORIES } from "@/constants/blogArticles";
import { BookOpen, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CATEGORY_GRADIENTS = [
  "from-primary/30 to-primary/10",
  "from-blue-500/30 to-cyan-500/10",
  "from-amber-500/30 to-orange-500/10",
  "from-emerald-500/30 to-teal-500/10",
  "from-pink-500/30 to-rose-500/10",
];

const ARTICLES_PER_PAGE = 20;

const Blog = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeLang, setActiveLang] = useState<string>("en");
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "Blog — HookCut | Guides & Tips for Content Creators";
    return () => { document.title = "HookCut — AI Video Repurposing for Creators"; };
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, activeLang]);

  const filtered = useMemo(() => {
    return BLOG_ARTICLES.filter((a) => {
      const langMatch = activeLang === "all" || (activeLang === "en" ? !a.lang || a.lang === "en" : a.lang === activeLang);
      const catMatch = activeCategory === "All" || a.category === activeCategory;
      return langMatch && catMatch;
    });
  }, [activeCategory, activeLang]);

  const totalPages = Math.ceil(filtered.length / ARTICLES_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Blog — HookCut | Guides & Tips for Content Creators</title>
        <meta name="description" content="Tips, guides, and strategies for content creators. Learn how to repurpose long videos into viral short clips with AI." />
        <link rel="canonical" href="https://hookcut.com/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hookcut.com/blog" />
        <meta property="og:title" content="HookCut Blog — Guides for Content Creators" />
        <meta property="og:description" content="Tips, guides, and strategies for content creators using AI video repurposing." />
        <meta property="og:image" content="https://hookcut.com/og-image.svg" />
      </Helmet>
      <Navbar />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('landing.blog.title')}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.blog.subtitle', 'Tips, guides, and strategies for content creators')}
            </p>
          </div>

          {/* Language Filter */}
          <div className="flex justify-center gap-2 mb-4">
            {[
              { key: "en", label: "EN" },
              { key: "es", label: "ES" },
              { key: "all", label: t('landing.blog.allLanguages', 'All') },
            ].map((lang) => (
              <button
                key={lang.key}
                onClick={() => setActiveLang(lang.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeLang === lang.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article count */}
          <p className="text-center text-sm text-muted-foreground mb-6">
            {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </p>

          {/* Article Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {paginated.map((article, i) => (
              <div
                key={article.slug}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300"
              >
                {/* Gradient Thumbnail */}
                <div className={`h-40 bg-gradient-to-br ${CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]} flex items-center justify-center`}>
                  <BookOpen className="w-12 h-12 text-foreground/20" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{article.category}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{article.readTime}</span>
                  </div>

                  <h2 className="text-lg font-semibold leading-snug mb-2 transition-colors line-clamp-2">
                    {article.lang && <span className="text-xs font-medium text-primary mr-1.5 uppercase">[{article.lang}]</span>}
                    {article.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {article.metaDescription}
                  </p>

                  <Link to={`/blog/${article.slug}`} className="flex items-center text-sm text-primary font-medium hover:underline">
                    {t('landing.blog.readArticle')} <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('landing.blog.prev', 'Previous')}
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                {t('landing.blog.next', 'Next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;

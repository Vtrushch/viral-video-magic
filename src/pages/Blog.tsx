import { useState } from "react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BLOG_ARTICLES, BLOG_CATEGORIES } from "@/constants/blogArticles";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

const CATEGORY_GRADIENTS = [
  "from-primary/30 to-primary/10",
  "from-blue-500/30 to-cyan-500/10",
  "from-amber-500/30 to-orange-500/10",
  "from-emerald-500/30 to-teal-500/10",
  "from-pink-500/30 to-rose-500/10",
];

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    document.title = "Blog — HookCut | Guides & Tips for Content Creators";
    return () => { document.title = "HookCut — AI Video Repurposing for Creators"; };
  }, []);

  const filtered = activeCategory === "All"
    ? BLOG_ARTICLES
    : BLOG_ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Guides, strategies, and tips for content creators who want to grow faster with AI.
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {filtered.map((article, i) => (
              <Link
                key={article.slug}
                to={`/blog/${article.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
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

                  <h2 className="text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {article.metaDescription}
                  </p>

                  <div className="flex items-center text-sm text-primary font-medium">
                    Read article <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;

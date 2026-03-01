import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BLOG_ARTICLES } from "@/constants/blogArticles";
import { ArrowLeft, Clock, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | HookCut Blog`;
      window.scrollTo(0, 0);
    }
    return () => { document.title = "HookCut — AI Video Repurposing for Creators"; };
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  const related = BLOG_ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);
  const formattedDate = new Date(article.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Back */}
          <Link
            to="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
            <span className="px-2 py-0.5 rounded-full bg-muted font-medium text-xs">{article.category}</span>
            <span>·</span>
            <span>{formattedDate}</span>
            <span>·</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readTime}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-8">{article.title}</h1>

          {/* Content */}
          <article className="prose prose-invert prose-lg max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:mt-10 prose-headings:mb-4
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-li:text-muted-foreground
            prose-table:border-border prose-th:text-foreground prose-th:border-border prose-td:border-border
            prose-hr:border-border
            prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
          ">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </article>

          {/* CTA */}
          <div className="mt-16 p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center">
            <h3 className="text-xl font-bold mb-2">Ready to start clipping?</h3>
            <p className="text-muted-foreground mb-4">
              Turn your long videos into viral short clips in minutes — free.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">Try HookCut Free <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {/* Related */}
          <div className="mt-20">
            <h3 className="text-xl font-bold mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all"
                >
                  <span className="text-xs text-muted-foreground">{r.category}</span>
                  <h4 className="text-sm font-semibold mt-1 group-hover:text-primary transition-colors line-clamp-2">
                    {r.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;

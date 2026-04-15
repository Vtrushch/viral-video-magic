import { Link } from "react-router-dom";
import { getENRelatedArticles, EN_ARTICLE_META } from "@/lib/relatedArticles";

interface ENRelatedArticlesProps {
  currentSlug: string;
}

export function ENRelatedArticles({ currentSlug }: ENRelatedArticlesProps) {
  const relatedSlugs = getENRelatedArticles(currentSlug);

  if (relatedSlugs.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Related Articles</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {relatedSlugs.map((slug) => {
          const meta = EN_ARTICLE_META[slug];
          if (!meta) return null;
          return (
            <Link
              key={slug}
              to={`/blog/${slug}`}
              className="group block rounded-lg border border-border p-5 hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                {meta.title}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {meta.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

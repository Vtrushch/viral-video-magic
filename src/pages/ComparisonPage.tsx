import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { COMPETITORS } from "@/constants/competitors";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X, Trophy, Target, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import NotFound from "@/pages/NotFound";

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span>{value}</span>;
}

const ComparisonPage = () => {
  const { competitor } = useParams<{ competitor: string }>();
  const data = competitor ? COMPETITORS[competitor] : undefined;

  if (!data) return <NotFound />;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.seo.title,
    description: data.seo.description,
    datePublished: "2026-03-08",
    dateModified: "2026-03-08",
    inLanguage: "en",
    author: { "@type": "Organization", name: "HookCut Team" },
    publisher: { "@type": "Organization", name: "HookCut", url: "https://hookcut.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": data.seo.canonical },
  };

  return (
    <div className="min-h-screen dark">
      <Helmet>
        <title>{data.seo.title}</title>
        <meta name="description" content={data.seo.description} />
        <link rel="canonical" href={data.seo.canonical} />
        <meta property="og:title" content={data.seo.title} />
        <meta property="og:description" content={data.seo.description} />
        <meta property="og:url" content={data.seo.canonical} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={data.seo.title} />
        <meta name="twitter:description" content={data.seo.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-40" />
        <div className="absolute inset-0 grid-overlay" />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 8px hsl(160, 84%, 39%, 0.6)" }} />
            <span>Updated for 2026</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black max-w-4xl mx-auto mb-6 leading-[1.05]">
            <span className="text-foreground">HookCut vs </span>
            <span className="shimmer-text font-serif-display italic">{data.name}</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-muted-foreground leading-relaxed">
            {data.keyMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow min-h-[44px]" asChild>
              <Link to="/auth">
                Try HookCut Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 min-h-[44px]" asChild>
              <a href="#comparison">See Full Comparison</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Verdict Cards */}
      <section className="py-20 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-4">
            Quick <span className="font-serif-display italic text-muted-foreground">Verdict</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            The key differences at a glance
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {data.verdictCards.map((card, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center">
                <div className="mb-4 flex justify-center">
                  {i === 0 ? <Target className="w-8 h-8 text-primary" /> : i === 1 ? <Trophy className="w-8 h-8 text-accent" /> : <Zap className="w-8 h-8 text-secondary" />}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-4">{card.title}</h3>
                <div className="space-y-3">
                  <div className={`rounded-lg px-3 py-2 text-sm ${card.winner === "hookcut" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "glass-card text-muted-foreground"}`}>
                    <span className="font-semibold text-foreground block text-xs mb-0.5">HookCut</span>
                    {card.hookcut}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-sm ${card.winner === "competitor" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "glass-card text-muted-foreground"}`}>
                    <span className="font-semibold text-foreground block text-xs mb-0.5">{data.name}</span>
                    {card.competitor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="py-20 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-4">
            Feature-by-Feature <span className="font-serif-display italic text-muted-foreground">Comparison</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            How HookCut stacks up against {data.name} in 2026
          </p>
          <div className="max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                    <th className="text-center p-4 font-bold text-primary">HookCut</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">{data.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparisonRows.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <td className="p-4 text-foreground font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-emerald-500 font-medium">
                        <CellValue value={row.hookcut} />
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        <CellValue value={row.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Where HookCut Wins / Where Competitor Wins */}
      <section className="py-20 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* HookCut Wins */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Where HookCut wins
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Advantages over {data.name}</p>
              <div className="space-y-4">
                {data.hookcutWins.map((item, i) => (
                  <div key={i} className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Wins */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                Where {data.name} wins
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Their advantages</p>
              <div className="space-y-4">
                {data.competitorWins.map((item, i) => (
                  <div key={i} className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-20 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-4">
            Pricing <span className="font-serif-display italic text-muted-foreground">Comparison</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            See how much you save with HookCut
          </p>
          <div className="max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Tier</th>
                    <th className="text-center p-4 font-bold text-primary">HookCut</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">{data.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pricingComparison.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <td className="p-4 text-foreground font-medium">{row.tier}</td>
                      <td className="p-4 text-center text-emerald-500 font-medium text-sm">{row.hookcut}</td>
                      <td className="p-4 text-center text-muted-foreground text-sm">{row.competitor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-4">
            Frequently Asked <span className="font-serif-display italic text-muted-foreground">Questions</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Common questions about HookCut vs {data.name}
          </p>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {data.faq.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl border-none px-5">
                  <AccordionTrigger className="text-foreground font-medium text-left hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-40" />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-6">
              Ready to switch from{" "}
              <span className="shimmer-text font-serif-display italic">{data.name}</span>?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-10">
              Try HookCut free — no credit card required. Upload your first video and see the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow min-h-[44px]" asChild>
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 min-h-[44px]" asChild>
                <Link to="/#pricing">View Pricing</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-6">
              No credit card required · 3 free clips · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ComparisonPage;

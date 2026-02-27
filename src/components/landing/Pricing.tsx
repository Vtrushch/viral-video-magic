import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollRevealChildren } from "@/hooks/useScrollReveal";

const comparisonRows = [
  { feature: "Upload & analyze", hookcut: "Free, unlimited", others: "Per-minute billing" },
  { feature: "Edit before paying", hookcut: "Yes — full editor", others: "Limited or none" },
  { feature: "1-hour video analysis", hookcut: "0 credits", others: "~60 credits" },
  { feature: "Pricing model", hookcut: "Per rendered clip", others: "Per processing minute" },
  { feature: "YouTube import", hookcut: true, others: "Varies" },
  { feature: "Face tracking reframe", hookcut: true, others: true },
  { feature: "Caption styles", hookcut: "10+", others: "3–5" },
  { feature: "Hook A/B variants", hookcut: true, others: false },
  { feature: "Remix Mode", hookcut: true, others: false },
  { feature: "Languages supported", hookcut: "99", others: "10–30" },
  { feature: "Save to Camera Roll", hookcut: true, others: false },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span>{value}</span>;
}

const ComparisonAndCTA = () => {
  const { t } = useTranslation();
  const containerRef = useScrollRevealChildren();

  return (
    <>
      {/* Comparison */}
      <section className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6 sm:px-8" ref={containerRef}>
          <div className="text-center mb-16" data-reveal data-reveal-delay="0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-emerald-500 opacity-0 translate-y-8 transition-all duration-700">
              HONEST COMPARISON
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="100">
              We charge for{" "}
              <span className="font-serif-display italic text-muted-foreground">clips, not minutes</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-xl mx-auto opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="150">
              Most tools charge per processing minute — so a 1-hour video costs 60 credits before you even see a single clip. We don't.
            </p>
          </div>

          <div
            className="max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden opacity-0 translate-y-8 transition-all duration-700"
            data-reveal
            data-reveal-delay="200"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                    <th className="text-center p-4 font-bold text-primary">HookCut</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Others*</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <td className="p-4 text-foreground font-medium">{row.feature}</td>
                      <td className="p-4 text-center text-emerald-500 font-medium">
                        <CellValue value={row.hookcut} />
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        <CellValue value={row.others} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground/60 p-4">
              *Based on publicly available pricing from Opus Clip, Vizard, and similar tools as of 2025.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-40" />
        <div className="relative z-10 container mx-auto px-6 sm:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-6 opacity-0 animate-fade-in">
              Ready to find your next{" "}
              <span className="shimmer-text font-serif-display italic">viral clip</span>?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Start with 10 free renders. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow min-h-[44px]" asChild>
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 min-h-[44px]" asChild>
                <Link to="/auth">See Pricing Plans</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              Free plan includes 10 render credits • Paid plans from $9/mo
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default ComparisonAndCTA;

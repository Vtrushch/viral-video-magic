import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollRevealChildren } from "@/hooks/useScrollReveal";
import { PLANS, type PlanKey } from "@/constants/pricing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span>{value}</span>;
}

const PricingCards = () => {
  const { t } = useTranslation();
  const containerRef = useScrollRevealChildren();
  const planKeys: PlanKey[] = ["free", "starter", "pro", "agency"];

  return (
    <section id="pricing" className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      <div className="relative z-10 container mx-auto px-6 sm:px-8" ref={containerRef}>
        <div className="text-center mb-16" data-reveal data-reveal-delay="0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-emerald-500 opacity-0 translate-y-8 transition-all duration-700">
            {t("landing.pricing.label", "Simple pricing")}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="100">
            {t("landing.pricing.heading", "Plans that scale with you")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {planKeys.map((key, i) => {
            const plan = PLANS[key];
            return (
              <Card
                key={key}
                className={`relative flex flex-col border bg-card/50 backdrop-blur-sm opacity-0 translate-y-8 transition-all duration-700 ${
                  plan.popular ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
                data-reveal
                data-reveal-delay={String(100 + i * 80)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                    {t("landing.pricing.mostPopular", "Most Popular")}
                  </Badge>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-foreground">${plan.price}</span>
                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? "hero" : "hero-outline"}
                    className="w-full min-h-[44px]"
                    asChild
                  >
                    <Link to="/auth">
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ComparisonAndCTA = () => {
  const { t } = useTranslation();
  const containerRef = useScrollRevealChildren();

  const comparisonRows = [
    { feature: t("landing.pricing.rowUploadAnalyze"), hookcut: t("landing.pricing.hookFreeUnlimited"), others: t("landing.pricing.hookPerMinute") },
    { feature: t("landing.pricing.rowEditBefore"), hookcut: t("landing.pricing.hookYesFullEditor"), others: t("landing.pricing.hookLimitedNone") },
    { feature: t("landing.pricing.rowOneHour"), hookcut: t("landing.pricing.hook0Credits"), others: t("landing.pricing.hook60Credits") },
    { feature: t("landing.pricing.rowPricingModel"), hookcut: t("landing.pricing.hookPerClip"), others: t("landing.pricing.hookPerProcessing") },
    { feature: t("landing.pricing.rowYoutubeImport"), hookcut: true as boolean | string, others: t("landing.pricing.hookVaries") },
    { feature: t("landing.pricing.rowFaceTracking"), hookcut: true as boolean | string, others: true as boolean | string },
    { feature: t("landing.pricing.rowCaptionStyles"), hookcut: t("landing.pricing.hook10Plus"), others: t("landing.pricing.hook3to5") },
    { feature: t("landing.pricing.rowHookVariants"), hookcut: true as boolean | string, others: false as boolean | string },
    { feature: t("landing.pricing.rowRemixMode"), hookcut: true as boolean | string, others: false as boolean | string },
    { feature: t("landing.pricing.rowLanguages"), hookcut: t("landing.pricing.hook99"), others: t("landing.pricing.hook10to30") },
    { feature: t("landing.pricing.rowCameraRoll"), hookcut: true as boolean | string, others: false as boolean | string },
  ];

  return (
    <>
      <PricingCards />
      <section className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="relative z-10 container mx-auto px-6 sm:px-8" ref={containerRef}>
          <div className="text-center mb-16" data-reveal data-reveal-delay="0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-emerald-500 opacity-0 translate-y-8 transition-all duration-700">
              {t("landing.pricing.comparisonLabel")}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="100">
              {t("landing.pricing.comparisonHeading")}{" "}
              <span className="font-serif-display italic text-muted-foreground">{t("landing.pricing.comparisonHeadingAccent")}</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-xl mx-auto opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="150">
              {t("landing.pricing.comparisonSubtext")}
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
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("landing.pricing.comparisonFeature")}</th>
                    <th className="text-center p-4 font-bold text-primary">HookCut</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">{t("landing.pricing.comparisonOthers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
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
              {t("landing.pricing.comparisonFootnote")}
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
              {t("landing.hero.ctaFinal")}{" "}
              <span className="shimmer-text font-serif-display italic">{t("landing.hero.ctaViralClip")}</span>?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {t("landing.hero.ctaSubtext")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow min-h-[44px]" asChild>
                <Link to="/auth">
                  {t("landing.hero.ctaButton")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 min-h-[44px]" asChild>
                <Link to="/auth">{t("landing.hero.ctaPricing")}</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {t("landing.hero.ctaFootnote")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default ComparisonAndCTA;

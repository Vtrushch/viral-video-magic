import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PLANS, ADDON_PACK } from "@/constants/pricing";

const Pricing = () => {
  const { t } = useTranslation();
  const plans = Object.values(PLANS);

  return (
    <section id="pricing" className="py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 animate-fade-in">
            {t('landing.pricing.label')}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {t('landing.pricing.heading')} <span className="gradient-text">{t('landing.pricing.headingAccent')}</span>
          </h2>
          <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {t('landing.pricing.subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-start">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 transition-all duration-500 opacity-0 animate-fade-in ${
                plan.popular
                  ? "glass-card glow-border scale-[1.03] border-primary/30"
                  : "glass-card-hover"
              }`}
              style={{ animationDelay: `${0.25 + i * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                  {t('landing.pricing.mostPopular')}
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-foreground">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground">{t('landing.pricing.perMonth')}</span>
                )}
              </div>
              <Button
                variant={plan.popular ? "hero" : "hero-outline"}
                className="w-full mb-8"
                asChild
              >
                <Link to={`/auth?plan=${Object.keys(PLANS)[i]}`}>{plan.cta}</Link>
              </Button>
              <ul className="space-y-2.5">
                {plan.features.map((feature) =>
                  feature.includes("coming soon") ? (
                    <li key={feature} className="flex items-start gap-2 text-xs opacity-50">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-muted-foreground italic">{feature}</span>
                    </li>
                  ) : (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Add-on pack */}
        <div className="max-w-2xl mx-auto mt-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Need more clips?</p>
            <p className="text-muted-foreground text-sm">
              +${ADDON_PACK.price} for {ADDON_PACK.renders} extra renders. Available on any paid plan. Max {ADDON_PACK.maxPerMonth} extra/month.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Pricing;

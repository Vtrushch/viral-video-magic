import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Globe, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();

  const pills = [
    { icon: Sparkles, text: t('landing.hero.pills.aiFinds') },
    { icon: Zap, text: t('landing.hero.pills.proCaptions') },
    { icon: Globe, text: t('landing.hero.pills.languages') },
    { icon: Smartphone, text: t('landing.hero.pills.export') },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero-bg" aria-label="HookCut hero">
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 mesh-gradient" />
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay" />

      {/* Animated orbs */}
      <div className="absolute top-1/4 left-[15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-float" style={{ background: "hsl(349, 100%, 59%, 0.06)" }} />
      <div className="absolute bottom-1/4 right-[15%] w-[400px] h-[400px] rounded-full blur-[120px] animate-float" style={{ background: "hsl(270, 95%, 65%, 0.06)", animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: "hsl(177, 100%, 39%, 0.03)" }} />

      <div className="relative z-10 container mx-auto px-6 text-center pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm text-primary mb-10 opacity-0 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('landing.hero.badge')}</span>
        </div>

        {/* Heading */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black max-w-5xl mx-auto mb-8 leading-[1.05] opacity-0 animate-fade-in text-glow"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-foreground">{t('landing.hero.heading1')}</span>{" "}
          <span className="gradient-text">{t('landing.hero.heading2')}</span>{" "}
          <span className="text-foreground">{t('landing.hero.heading3')}</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-muted-foreground leading-relaxed opacity-0 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          {t('landing.hero.subheading')}{" "}
          <br className="hidden sm:block" />
          {t('landing.hero.stopEditing')}
        </p>

        {/* CTA */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow" asChild>
            <Link to="/auth">
              {t('landing.hero.getStartedFree')}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
            <a href="#how-it-works">{t('landing.hero.seeHowItWorks')}</a>
          </Button>
        </div>

        {/* Feature Pills */}
        <div
          className="flex flex-wrap justify-center gap-3 mt-16 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          {pills.map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-muted-foreground hover:text-foreground hover:scale-105 transition-all duration-300 cursor-default"
            >
              <item.icon className="w-4 h-4 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div
          className="mt-20 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.7s" }}
        >
          <p className="text-sm text-muted-foreground mb-6">{t('landing.hero.builtBy')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: "✨", text: t('landing.hero.badge1') },
              { icon: "🔒", text: t('landing.hero.badge2') },
              { icon: "⚡", text: t('landing.hero.badge3') },
            ].map((badge) => (
              <div
                key={badge.text}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-muted-foreground"
              >
                <span>{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

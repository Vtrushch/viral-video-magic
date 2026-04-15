import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();
  const cyclingWords = t("landing.hero.cyclingWords", { returnObjects: true }) as string[];
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % cyclingWords.length);
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [cyclingWords.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero-bg" aria-label="HookCut hero">
      <div className="absolute inset-0 mesh-gradient opacity-40" />
      <div className="absolute inset-0 grid-overlay" />

      <div className="absolute top-1/4 left-[15%] w-[400px] h-[400px] rounded-full blur-[140px] animate-float" style={{ background: "hsl(349, 100%, 59%, 0.05)" }} />
      <div className="absolute bottom-1/4 right-[15%] w-[350px] h-[350px] rounded-full blur-[140px] animate-float" style={{ background: "hsl(270, 95%, 65%, 0.05)", animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: "hsl(177, 100%, 39%, 0.02)" }} />

      <div className="relative z-10 container mx-auto px-6 text-center pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm text-muted-foreground mb-10 opacity-0 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 8px hsl(160, 84%, 39%, 0.6)" }} />
          <span>{t("landing.hero.analysisFree")}</span>
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black max-w-4xl mx-auto mb-8 leading-[1.05] opacity-0 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-foreground">{t("landing.hero.heroYourNext")} </span>
          <span className="shimmer-text font-serif-display italic">{t("landing.hero.heroViralShort")}</span>
          <br />
          <span className="text-foreground">{t("landing.hero.heroIsHidingIn")} </span>
          <span
            className="text-primary inline-block min-w-[140px] sm:min-w-[200px] transition-all duration-300"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
          >
            {cyclingWords[wordIndex]}
          </span>
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-12 text-muted-foreground leading-relaxed opacity-0 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          {t("landing.hero.subheading")}
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow min-h-[44px]" asChild>
            <Link to="/auth">
              {t("landing.hero.getStartedFree")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 min-h-[44px]" asChild>
            <a href="#how-it-works">
              <Play className="w-4 h-4 mr-1 fill-current" />
              {t("landing.hero.seeHowItWorks")}
            </a>
          </Button>
        </div>

        <div
          className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-16 text-xs sm:text-sm text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          <span>{t("landing.hero.socialProof1")}</span>
          <span className="hidden sm:inline text-border">|</span>
          <span>{t("landing.hero.socialProof2")}</span>
          <span className="hidden sm:inline text-border">|</span>
          <span>{t("landing.hero.socialProof3")}</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;

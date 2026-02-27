import { useTranslation } from "react-i18next";
import { useScrollRevealChildren } from "@/hooks/useScrollReveal";

const features = [
  { emoji: "🎯", title: "Smart face tracking", description: "AI detects faces and reframes your video to keep the speaker centered in 9:16." },
  { emoji: "🔤", title: "10+ caption styles", description: "Hormozi, MrBeast, Karaoke, Minimal — trending styles that make your clips pop." },
  { emoji: "📱", title: "YouTube import", description: "Paste any public YouTube link. We download up to 1080p, analyze, and clip — all automatic." },
  { emoji: "🔄", title: "Remix Mode", description: "Swap hooks, change caption styles, try different crops — experiment freely before rendering." },
  { emoji: "🎬", title: "Hook A/B variants", description: "AI generates alternative hooks for each clip. Test which opening grabs more attention." },
  { emoji: "🌍", title: "99 languages", description: "Auto-detected language with pro captions. From English to Ukrainian to Japanese." },
];

const creditItems = [
  { symbol: "∞", label: "Free uploads", green: true },
  { symbol: "∞", label: "Free analysis", green: true },
  { symbol: "∞", label: "Free editing", green: true },
  { symbol: "1", label: "Credit per render", green: false },
];

const WhyHookCut = () => {
  const { t } = useTranslation();
  const containerRef = useScrollRevealChildren();

  return (
    <section className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      <div className="relative z-10 container mx-auto px-6 sm:px-8" ref={containerRef}>
        {/* Header */}
        <div className="text-center mb-16" data-reveal data-reveal-delay="0">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 translate-y-8 transition-all duration-700">
            WHY HOOKCUT
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="100">
            Built different.{" "}
            <span className="font-serif-display italic text-muted-foreground">Priced fair.</span>
          </h2>
        </div>

        {/* Credits Explainer */}
        <div
          className="max-w-3xl mx-auto mb-16 rounded-2xl p-8 sm:p-10 text-center border border-primary/10 opacity-0 translate-y-8 transition-all duration-700"
          style={{ background: "linear-gradient(135deg, hsl(349,100%,59%,0.05), hsl(270,95%,65%,0.05))" }}
          data-reveal
          data-reveal-delay="150"
        >
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">HOW OUR PRICING WORKS</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            1 credit = 1 rendered clip. That's it.
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            Upload, analyze, edit, preview — all <strong className="text-foreground">free and unlimited</strong>. You only spend a credit when you render the final clip. No minutes cap, no hidden fees.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {creditItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <span className={`text-3xl font-black ${item.green ? "text-emerald-500" : "text-primary"}`}>
                  {item.symbol}
                </span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-6 hover:border-primary/15 hover:-translate-y-1 transition-all duration-300 opacity-0 translate-y-8"
              data-reveal
              data-reveal-delay={String(200 + i * 80)}
            >
              <span className="text-2xl mb-3 block">{feature.emoji}</span>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyHookCut;

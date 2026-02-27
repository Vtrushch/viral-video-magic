import { useTranslation } from "react-i18next";
import { useScrollRevealChildren } from "@/hooks/useScrollReveal";

const steps = [
  {
    number: "01",
    emoji: "📤",
    title: "Upload or paste link",
    description: "Drop any video up to 2 hours, or paste a YouTube URL. We handle the rest.",
  },
  {
    number: "02",
    emoji: "🧠",
    title: "AI finds viral moments",
    description: "Gemini AI watches your entire video and picks up to 15 best clips with viral scores. Free and unlimited.",
  },
  {
    number: "03",
    emoji: "✂️",
    title: "Edit for free",
    description: "Change captions, adjust timing, try Remix Mode to swap hooks and styles — all before spending a single credit.",
  },
  {
    number: "04",
    emoji: "🚀",
    title: "Render & share",
    description: "Happy with the result? Render in 1080p for 1 credit. Download or save straight to your camera roll.",
  },
];

const HowItWorks = () => {
  const { t } = useTranslation();
  const containerRef = useScrollRevealChildren();

  return (
    <section id="how-it-works" className="py-24 sm:py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      <div className="relative z-10 container mx-auto px-6 sm:px-8" ref={containerRef}>
        <div className="text-center mb-16" data-reveal data-reveal-delay="0">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 translate-y-8 transition-all duration-700">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 translate-y-8 transition-all duration-700" data-reveal data-reveal-delay="100">
            Four steps.{" "}
            <span className="font-serif-display italic text-muted-foreground">You only pay at step 4.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="glass-card rounded-2xl p-6 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 opacity-0 translate-y-8"
              data-reveal
              data-reveal-delay={String(200 + i * 100)}
            >
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">
                Step {step.number}
              </p>
              <span className="text-3xl mb-4 block">{step.emoji}</span>
              <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

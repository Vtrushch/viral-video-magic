import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Globe, Smartphone } from "lucide-react";

const pills = [
  { icon: Sparkles, text: "AI finds viral moments" },
  { icon: Zap, text: "Pro captions in seconds" },
  { icon: Globe, text: "30+ languages" },
  { icon: Smartphone, text: "Export everywhere" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero-bg">
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
          <span>AI-Powered Video Repurposing</span>
        </div>

        {/* Heading */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black max-w-5xl mx-auto mb-8 leading-[1.05] opacity-0 animate-fade-in text-glow"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-foreground">Turn 1 hour into</span>{" "}
          <span className="gradient-text">10 viral shorts</span>{" "}
          <span className="text-foreground">in 5 minutes</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-muted-foreground leading-relaxed opacity-0 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          AI-powered video repurposing for creators, agencies, and brands.
          <br className="hidden sm:block" />
          Stop editing. Start scaling.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Button variant="hero" size="lg" className="text-base px-8 py-6 animate-pulse-glow" asChild>
            <Link to="/auth">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
            <a href="#how-it-works">See How It Works</a>
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
          <p className="text-sm text-muted-foreground mb-5">Trusted by 10,000+ creators worldwide</p>
          <div className="flex justify-center items-center gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-background -ml-2 first:ml-0 overflow-hidden"
                style={{ background: `hsl(${349 + i * 30}, 60%, ${45 + i * 5}%)` }}
              >
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {String.fromCharCode(65 + i)}
                </div>
              </div>
            ))}
            <span className="ml-3 text-sm text-muted-foreground">+10k</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

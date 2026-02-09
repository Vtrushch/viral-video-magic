import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Captions, Globe, Share2 } from "lucide-react";

const highlights = [
  { icon: Zap, text: "AI finds viral moments" },
  { icon: Captions, text: "Pro captions in seconds" },
  { icon: Globe, text: "Multi-language support" },
  { icon: Share2, text: "Export to all platforms" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-hero-bg overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary mb-8 animate-fade-in">
          <Zap className="w-3.5 h-3.5" />
          <span>AI-Powered Video Repurposing</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black max-w-5xl mx-auto mb-6 animate-fade-in text-primary-foreground leading-[1.05]" style={{ animationDelay: "0.1s" }}>
          Turn 1 hour into{" "}
          <span className="gradient-text">10 viral shorts</span>{" "}
          in 5 minutes
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in text-muted-foreground" style={{ animationDelay: "0.2s" }}>
          AI-powered video repurposing for creators, agencies, and brands. Stop editing. Start scaling.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
            <Link to="/auth">Get Started Free</Link>
          </Button>
          <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
            <a href="#features">See How It Works</a>
          </Button>
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap justify-center gap-6 mt-16 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {highlights.map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
              <item.icon className="w-4 h-4 text-accent" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;

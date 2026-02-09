import { Crosshair, Captions, Globe, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Crosshair,
    title: "Smart Clip Detection",
    description: "AI analyzes engagement patterns to find the most shareable moments in your long-form content.",
  },
  {
    icon: Captions,
    title: "Auto Captions",
    description: "Professional animated captions generated automatically. Choose from multiple styles and animations.",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    description: "Translate and dub your content into 30+ languages. Reach a global audience effortlessly.",
  },
  {
    icon: BarChart3,
    title: "Viral Score",
    description: "Each clip gets a viral potential score powered by AI to help you pick the winners.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-40" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 animate-fade-in">
            Features
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Everything you need to{" "}
            <span className="gradient-text">go viral</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Powerful AI tools that handle the heavy lifting so you can focus on creating.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group glass-card-hover rounded-2xl p-8 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.25 + i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

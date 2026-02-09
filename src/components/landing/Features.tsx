import { Zap, Captions, Globe, Share2 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI Viral Detection",
    description: "Our AI analyzes engagement patterns to find the most shareable moments in your long-form content.",
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
    icon: Share2,
    title: "Platform Export",
    description: "One-click export optimized for TikTok, Reels, Shorts, and every major platform.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need to <span className="gradient-text">go viral</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful AI tools that handle the heavy lifting so you can focus on creating.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

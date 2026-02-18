import { Crosshair, Captions, Globe, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Crosshair,
      title: t('landing.features.feature1Title'),
      description: t('landing.features.feature1Desc'),
    },
    {
      icon: Captions,
      title: t('landing.features.feature2Title'),
      description: t('landing.features.feature2Desc'),
    },
    {
      icon: Globe,
      title: t('landing.features.feature3Title'),
      description: t('landing.features.feature3Desc'),
    },
    {
      icon: BarChart3,
      title: t('landing.features.feature4Title'),
      description: t('landing.features.feature4Desc'),
    },
  ];

  return (
    <section id="features" className="py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-40" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 animate-fade-in">
            {t('landing.features.label')}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {t('landing.features.heading')}{" "}
            <span className="gradient-text">{t('landing.features.headingAccent')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {t('landing.features.subheading')}
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

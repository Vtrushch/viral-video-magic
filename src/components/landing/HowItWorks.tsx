import { Upload, Cpu, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Upload,
      number: "01",
      title: t('landing.howItWorks.step1Title'),
      description: t('landing.howItWorks.step1Desc'),
    },
    {
      icon: Cpu,
      number: "02",
      title: t('landing.howItWorks.step2Title'),
      description: t('landing.howItWorks.step2Desc'),
    },
    {
      icon: Download,
      number: "03",
      title: t('landing.howItWorks.step3Title'),
      description: t('landing.howItWorks.step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 animate-fade-in">
            {t('landing.howItWorks.label')}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {t('landing.howItWorks.heading')} <span className="gradient-text">{t('landing.howItWorks.headingAccent')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative group glass-card-hover rounded-2xl p-8 text-center opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.2 + i * 0.15}s` }}
            >
              {/* Number badge */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full gradient-bg text-sm font-bold text-primary-foreground mb-6">
                {step.number}
              </div>

              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors duration-300">
                <step.icon className="w-7 h-7 text-primary" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

              {/* Connector line (hidden on last + mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

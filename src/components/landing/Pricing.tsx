import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: 9,
    description: "Perfect for individual creators",
    features: ["5 videos/month", "40 clips/month", "720p export", "Basic captions", "Email support"],
    popular: false,
  },
  {
    name: "Pro",
    price: 19,
    description: "For serious content creators",
    features: ["25 videos/month", "100 clips/month", "1080p export", "Animated captions", "Multi-language", "Priority support"],
    popular: true,
  },
  {
    name: "Agency",
    price: 39,
    description: "For teams and agencies",
    features: ["Unlimited videos", "300 clips/month", "4K export", "Custom branding", "API access", "Team seats", "Dedicated support"],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-28 relative overflow-hidden gradient-hero-bg">
      <div className="absolute inset-0 mesh-gradient opacity-30" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 opacity-0 animate-fade-in">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-500 opacity-0 animate-fade-in ${
                plan.popular
                  ? "glass-card glow-border scale-[1.03] border-primary/30"
                  : "glass-card-hover"
              }`}
              style={{ animationDelay: `${0.25 + i * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button
                variant={plan.popular ? "hero" : "hero-outline"}
                className="w-full mb-8"
                asChild
              >
                <Link to="/auth">{plan.name === "Agency" ? "Contact Sales" : "Get Started"}</Link>
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;

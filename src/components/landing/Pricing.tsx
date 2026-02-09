import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: 9,
    description: "Perfect for individual creators",
    features: ["5 videos/month", "30 clips/month", "720p export", "Basic captions", "Email support"],
    popular: false,
  },
  {
    name: "Pro",
    price: 19,
    description: "For serious content creators",
    features: ["25 videos/month", "200 clips/month", "1080p export", "Animated captions", "Multi-language", "Priority support"],
    popular: true,
  },
  {
    name: "Agency",
    price: 39,
    description: "For teams and agencies",
    features: ["Unlimited videos", "Unlimited clips", "4K export", "Custom branding", "API access", "Team seats", "Dedicated support"],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? "border-primary bg-card glow-primary scale-[1.02]"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full mb-6"
                asChild
              >
                <Link to="/auth">Get Started</Link>
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
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

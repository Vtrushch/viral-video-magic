import { Check, Crown, Sparkles, Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";

const plans = [
  {
    name: "Free",
    price: 0,
    credits: 3,
    description: "Try it out",
    icon: Zap,
    features: ["3 credits included", "720p export", "Basic captions", "Community support"],
    current: true,
  },
  {
    name: "Starter",
    price: 9,
    credits: 30,
    description: "For individual creators",
    icon: Sparkles,
    features: ["30 credits/month", "1080p export", "All caption styles", "Email support", "Multi-language captions"],
    popular: false,
  },
  {
    name: "Pro",
    price: 29,
    credits: 100,
    description: "For serious creators",
    icon: Crown,
    features: ["100 credits/month", "4K export", "Animated captions", "Priority support", "Custom branding", "API access"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 79,
    credits: -1,
    description: "For teams & agencies",
    icon: Building2,
    features: ["Unlimited credits", "4K export", "Custom branding", "Dedicated support", "Team seats", "SLA guarantee", "Custom integrations"],
    popular: false,
  },
];

const Upgrade = () => {
  const { credits, loading } = useCredits();

  return (
    <div className="p-6 lg:p-8 w-full" style={{ minHeight: "100vh" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Upgrade Your Plan</h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading your credits..."
              : credits
              ? `You're on the ${credits.plan} plan with ${credits.remaining} credits remaining.`
              : "Choose a plan to get started."}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl p-6 flex flex-col transition-all duration-300"
              style={{
                background: "hsl(240,15%,10%,0.6)",
                border: plan.popular
                  ? "1px solid hsl(349,100%,59%,0.4)"
                  : "1px solid hsl(0,0%,100%,0.08)",
                boxShadow: plan.popular
                  ? "0 0 40px -10px hsl(349,100%,59%,0.15)"
                  : undefined,
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "linear-gradient(135deg, hsl(349,100%,59%), hsl(270,95%,65%))",
                    color: "#fff",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <plan.icon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              </div>

              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-foreground">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>

              <p className="text-xs text-primary font-semibold mb-5">
                {plan.credits === -1 ? "Unlimited credits" : `${plan.credits} credits${plan.price > 0 ? "/month" : ""}`}
              </p>

              <Button
                variant={plan.current ? "outline" : "hero"}
                size="sm"
                className="w-full mb-5"
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : "Coming Soon"}
              </Button>

              <ul className="space-y-2.5 mt-auto">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ / Info */}
        <div
          className="mt-10 rounded-2xl p-6 text-center"
          style={{
            background: "hsl(240,15%,10%,0.4)",
            border: "1px solid hsl(0,0%,100%,0.06)",
          }}
        >
          <p className="text-sm text-muted-foreground">
            Payment integration coming soon. Need more credits now?{" "}
            <span className="text-primary font-medium">Contact us</span> and we'll set you up.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;

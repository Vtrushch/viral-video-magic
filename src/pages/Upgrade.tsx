import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Clock, Crown, Sparkles, Zap, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useTranslation } from "react-i18next";
import { posthog } from "@/lib/posthog";
import { PLANS, ADDON_PACK, STRIPE_PRICES, type PlanKey } from "@/constants/pricing";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const PLAN_ICONS: Record<PlanKey, React.ElementType> = {
  free: Zap,
  starter: Sparkles,
  pro: Crown,
  agency: Building2,
};

const Upgrade = () => {
  const { credits, loading, refetch: refetchCredits } = useCredits();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture('pricing_viewed');
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success(t("upgrade.paymentSuccess"), { duration: 5000 });
      refetchCredits();
      setSearchParams({});
    }

    if (canceled === "true") {
      toast.info(t("upgrade.paymentCanceled"));
      setSearchParams({});
    }
  }, [searchParams]);

  const handleCheckout = async (planKey: string) => {
    if (planKey === "free") return;

    const priceId = STRIPE_PRICES[planKey];
    if (!priceId) return;

    setCheckoutLoading(planKey);
    try {
      const res = await apiFetch("/create-checkout", {
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard/upgrade?success=true`,
        cancel_url: `${window.location.origin}/dashboard/upgrade?canceled=true`,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(t("upgrade.failedCheckout"));
      }
    } catch (err) {
      toast.error(t("upgrade.paymentError"));
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await apiFetch("/create-portal", {});
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error(t("upgrade.failedPortal"));
    }
  };

  const planEntries = Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][];

  return (
    <div className="p-6 lg:p-8 w-full animate-fade-in" style={{ minHeight: "100vh", background: "#0F0F1A" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("upgrade.title")}</h1>
          <p className="text-muted-foreground">
            {loading
              ? t("upgrade.loadingCredits")
              : credits
              ? t("upgrade.planStatus", { plan: credits.plan, remaining: credits.remaining })
              : t("upgrade.choosePlan")}
          </p>
        </div>

        {/* Credit model explainer */}
        <div className="mb-8 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-lg">🎬</span>
            <span><span className="text-foreground font-medium">{t("upgrade.creditExplainer1")}</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-lg">🔍</span>
            <span><span className="text-foreground font-medium">{t("upgrade.creditExplainer2")}</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-lg">✂️</span>
            <span><span className="text-foreground font-medium">{t("upgrade.creditExplainer3")}</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {planEntries.map(([key, plan]) => {
            const Icon = PLAN_ICONS[key];
            const isCurrent = credits?.plan?.toLowerCase() === key;

            return (
              <div
                key={key}
                className="relative rounded-2xl p-6 flex flex-col transition-all duration-300"
                style={{
                  background: "hsl(240,15%,10%,0.6)",
                  border: plan.popular ? "1px solid hsl(349,100%,59%,0.4)" : "1px solid hsl(0,0%,100%,0.08)",
                  boxShadow: plan.popular ? "0 0 40px -10px hsl(349,100%,59%,0.15)" : undefined,
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "linear-gradient(135deg, hsl(349,100%,59%), hsl(270,95%,65%))", color: "#fff" }}
                  >
                    {t("upgrade.mostPopular")}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">{t("upgrade.perMonth")}</span>}
                </div>

                <p className="text-xs text-primary font-semibold mb-5">
                  {plan.renders} {t("upgrade.creditsPerMonth")}
                </p>

                <Button
                  variant={isCurrent ? "outline" : "hero"}
                  size="sm"
                  className="w-full mb-5"
                  disabled={isCurrent || key === "free" || checkoutLoading === key}
                  onClick={() => handleCheckout(key)}
                >
                  {checkoutLoading === key ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {t("upgrade.redirecting")}</>
                  ) : isCurrent ? (
                    t("upgrade.currentPlan")
                  ) : key === "free" ? (
                    t("upgrade.currentPlan")
                  ) : (
                    t("upgrade.upgradeTo", { name: plan.name })
                  )}
                </Button>

                <ul className="space-y-2.5 mt-auto">
                  {plan.features.map((feature) =>
                    feature.includes("coming soon") ? (
                      <li key={feature} className="flex items-start gap-2 text-xs opacity-50">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground italic">{feature}</span>
                      </li>
                    ) : (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Manage Subscription */}
        {credits && credits.plan !== "free" && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" onClick={handleManageSubscription}>
              {t("upgrade.manageSubscription")}
            </Button>
          </div>
        )}

        {/* Add-on pack */}
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ background: "hsl(240,15%,10%,0.4)", border: "1px solid hsl(0,0%,100%,0.06)" }}>
          <p className="text-sm font-semibold text-foreground mb-1">{t("upgrade.needMoreClips")}</p>
          <p className="text-muted-foreground text-sm mb-3">
            {t("upgrade.addonDesc", { price: ADDON_PACK.price, renders: ADDON_PACK.renders, max: ADDON_PACK.maxPerMonth })}
          </p>
          {credits && credits.plan !== "free" ? (
            <Button
              variant="hero-outline"
              size="sm"
              onClick={() => handleCheckout("render_pack")}
              disabled={checkoutLoading === "render_pack"}
            >
              {checkoutLoading === "render_pack" ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {t("upgrade.processing")}</>
              ) : (
                t("upgrade.buyRenderPack")
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t("upgrade.upgradeFirst")}</p>
          )}
        </div>

        {/* Contact */}
        <div className="mt-4 rounded-2xl p-6 text-center" style={{ background: "hsl(240,15%,10%,0.4)", border: "1px solid hsl(0,0%,100%,0.06)" }}>
          <p className="text-sm text-muted-foreground">
            {t("upgrade.billingQuestions")}{" "}
            <a href="mailto:support@hookcut.com" className="text-primary font-medium hover:underline">{t("common.contactUs")}</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;

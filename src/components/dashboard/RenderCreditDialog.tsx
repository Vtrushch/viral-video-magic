import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Zap, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface RenderCreditDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  creditsRequired: number;
  creditsRemaining: number;
  loading?: boolean;
}

const RenderCreditDialog = ({
  open,
  onClose,
  onConfirm,
  creditsRequired,
  creditsRemaining,
  loading = false,
}: RenderCreditDialogProps) => {
  const { t } = useTranslation();

  if (!open) return null;

  const hasEnough = creditsRemaining >= creditsRequired;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{creditsRequired > 1 ? t("renderCredit.renderClips") : t("renderCredit.renderClip")}</h3>
            <p className="text-xs text-muted-foreground">{t("renderCredit.creditConfirmation")}</p>
          </div>
        </div>

        {hasEnough ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl"
              style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)" }}>
              <span className="text-muted-foreground">{t("renderCredit.creditsRequired")}</span>
              <span className="font-bold text-primary">{creditsRequired}</span>
            </div>
            <div className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl"
              style={{ background: "hsl(var(--muted)/0.3)" }}>
              <span className="text-muted-foreground">{t("renderCredit.afterRender")}</span>
              <span className="font-semibold text-foreground">{creditsRemaining - creditsRequired} {t("renderCredit.remaining")}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl"
            style={{ background: "hsl(var(--destructive)/0.1)", border: "1px solid hsl(var(--destructive)/0.3)" }}>
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-destructive font-semibold">{t("renderCredit.notEnoughCredits")}</p>
              <p className="text-destructive/80 text-xs mt-0.5">
                {t("renderCredit.needHaveMsg", { need: creditsRequired, have: creditsRemaining })}
              </p>
            </div>
          </div>
        )}

        {hasEnough && (
          <p className="text-xs text-muted-foreground/70 mt-2">
            {t("renderCredit.watermarkNote")} <Link to="/dashboard/upgrade" className="text-primary hover:underline">{t("renderCredit.upgradeToRemove")}</Link>
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          {hasEnough ? (
            <Button variant="hero" size="sm" className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t("common.rendering")}</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-1.5" /> {creditsRequired > 1 ? t("renderCredit.useCredits", { count: creditsRequired }) : t("renderCredit.useCredit", { count: creditsRequired })}</>
              )}
            </Button>
          ) : (
            <Button variant="hero" size="sm" className="flex-1" asChild>
              <a href="/dashboard/upgrade">{t("renderCredit.upgradePlan")}</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenderCreditDialog;
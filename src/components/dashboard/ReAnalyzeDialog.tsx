import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { posthog } from "@/lib/posthog";
import { useTranslation } from "react-i18next";

interface ReAnalyzeDialogProps {
  open: boolean;
  onClose: () => void;
  video: Tables<"videos">;
  existingClipCount: number;
  onSuccess: () => void;
}

const clipCountOptions = [5, 10, 15];
const clipLengthOptions = [
  { value: "short", label: "short", time: "15–30s" },
  { value: "medium", label: "medium", time: "30–60s" },
  { value: "long", label: "long", time: "60–90s" },
];
const captionStyleOptions = [
  { value: "hormozi", label: "Hormozi" },
  { value: "mrbeast", label: "MrBeast" },
  { value: "minimal", label: "Minimal" },
  { value: "custom", label: "Custom", pro: true },
];
const outputFormatOptions = [
  { value: "9:16", label: "9:16", desc: "TikTok, Reels" },
  { value: "1:1", label: "1:1", desc: "Instagram" },
  { value: "16:9", label: "16:9", desc: "YouTube" },
];

const ReAnalyzeDialog = ({ open, onClose, video, existingClipCount, onSuccess }: ReAnalyzeDialogProps) => {
  const { t } = useTranslation();
  const settings = video.settings as Record<string, unknown> | null;

  const [clipCount, setClipCount] = useState<number>((settings?.clipCount as number) || 10);
  const [clipLength, setClipLength] = useState<string>((settings?.clipLength as string) || "medium");
  const [captionStyle, setCaptionStyle] = useState<string>((settings?.captionStyle as string) || "hormozi");
  const [outputFormat, setOutputFormat] = useState<string>((settings?.outputFormat as string) || "9:16");
  const [reframeMode, setReframeMode] = useState<"smart" | "full" | "center">((settings?.reframeMode as "smart" | "full" | "center") || "smart");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleReAnalyze = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("clips").delete().eq("video_id", video.id);
      await supabase.from("highlight_reels" as any).delete().eq("video_id", video.id);

      const newSettings = { clipCount, clipLength, captionStyle, outputFormat, reframeMode, languages: ["en"] };
      const { error } = await supabase
        .from("videos")
        .update({ status: "analyzing", settings: newSettings } as any)
        .eq("id", video.id);

      if (error) throw error;

      try {
        await apiFetch("/analyze", { video_id: video.id });
      } catch (e) {
        console.error("Modal webhook error:", e);
      }

      posthog.capture('video_reanalyzed', {
        clip_count: clipCount,
        reframe_mode: reframeMode,
      });

      toast.success(t("reanalyze.reAnalysisStarted"));
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t("reanalyze.reAnalysisFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const btnBase = "px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer";
  const btnActive = "border-primary/60 bg-primary/15 text-primary";
  const btnInactive = "border-border/40 bg-muted/20 text-muted-foreground hover:border-border";

  const clipLengthLabel = (val: string) => {
    if (val === "short") return t("videoConfig.short");
    if (val === "medium") return t("videoConfig.medium");
    if (val === "long") return t("videoConfig.long");
    return val;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{t("reanalyze.reAnalyzeVideo")}</h3>
            <p className="text-xs text-muted-foreground">{t("reanalyze.reAnalyzeDesc")}</p>
          </div>
        </div>

        {/* Clip Count */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reanalyze.numberOfClips")}</label>
          <div className="flex gap-2">
            {clipCountOptions.map((n) => (
              <button key={n} onClick={() => setClipCount(n)}
                className={`flex-1 ${btnBase} ${clipCount === n ? btnActive : btnInactive}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Clip Length */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reanalyze.clipLength")}</label>
          <div className="flex gap-2">
            {clipLengthOptions.map((opt) => (
              <button key={opt.value} onClick={() => setClipLength(opt.value)}
                className={`flex-1 flex flex-col items-center ${btnBase} ${clipLength === opt.value ? btnActive : btnInactive}`}>
                <span>{clipLengthLabel(opt.value)}</span>
                <span className="text-[10px] opacity-70">{opt.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reanalyze.captionStyle")}</label>
          <div className="flex gap-2">
            {captionStyleOptions.map((opt) => (
              <button key={opt.value} onClick={() => setCaptionStyle(opt.value)}
                className={cn(
                  "flex-1 relative",
                  btnBase,
                  captionStyle === opt.value ? btnActive : btnInactive
                )}>
                {opt.label}
                {opt.pro && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-primary text-primary-foreground px-1 py-0.5 rounded-full leading-none">
                    PRO
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reanalyze.outputFormat")}</label>
          <div className="flex gap-2">
            {outputFormatOptions.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setOutputFormat(fmt.value)}
                className={cn(
                  "flex-1 flex flex-col items-center",
                  btnBase,
                  outputFormat === fmt.value ? btnActive : btnInactive
                )}
              >
                <span>{fmt.label}</span>
                <span className="text-[10px] opacity-60">{fmt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reframe Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reanalyze.reframeMode")}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: "smart" as const, label: t("videoConfig.smart"), desc: t("videoConfig.smartDesc") },
              { value: "full" as const, label: t("videoConfig.fullFrame"), desc: t("videoConfig.fullDesc") },
              { value: "center" as const, label: t("videoConfig.center"), desc: t("videoConfig.centerDesc") },
            ]).map((mode) => (
              <button
                key={mode.value}
                onClick={() => setReframeMode(mode.value)}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium border transition-colors text-center",
                  reframeMode === mode.value
                    ? btnActive
                    : btnInactive
                )}
              >
                <div>{mode.label}</div>
                <div className="text-[10px] opacity-60">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info text */}
        {existingClipCount > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            {t("reanalyze.replaceCurrentClips")}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="hero" size="sm" className="flex-1" onClick={handleReAnalyze} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t("common.starting")}</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> {t("reanalyze.reanalyze")}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReAnalyzeDialog;
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RotateCcw, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface ReAnalyzeDialogProps {
  open: boolean;
  onClose: () => void;
  video: Tables<"videos">;
  existingClipCount: number;
  onSuccess: () => void;
}

const clipCountOptions = [5, 10, 15];
const clipLengthOptions = [
  { value: "short", label: "Short", time: "15–30s" },
  { value: "medium", label: "Medium", time: "30–60s" },
  { value: "long", label: "Long", time: "60–90s" },
];
const captionStyleOptions = [
  { value: "hormozi", label: "Hormozi" },
  { value: "mrbeast", label: "MrBeast" },
  { value: "minimal", label: "Minimal" },
];

const ReAnalyzeDialog = ({ open, onClose, video, existingClipCount, onSuccess }: ReAnalyzeDialogProps) => {
  const [clipCount, setClipCount] = useState(10);
  const [clipLength, setClipLength] = useState("medium");
  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleReAnalyze = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Delete all existing clips for this video
      await supabase.from("clips").delete().eq("video_id", video.id);

      // 2. Delete all highlight reels for this video
      await supabase.from("highlight_reels" as any).delete().eq("video_id", video.id);

      // 3. Update video status back to analyzing with new settings
      const settings = { clipCount, clipLength, captionStyle, languages: ["en"] };
      const { error } = await supabase
        .from("videos")
        .update({ status: "analyzing", settings } as any)
        .eq("id", video.id);

      if (error) throw error;

      // 4. Trigger Modal analysis
      try {
        await apiFetch("/analyze", { video_id: video.id });
      } catch (e) {
        console.error("Modal webhook error:", e);
      }

      toast.success("Re-analysis started! Your clips will be regenerated.");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to start re-analysis");
    } finally {
      setSubmitting(false);
    }
  };

  const btnBase = "px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer";
  const btnActive = "border-primary/60 bg-primary/15 text-primary";
  const btnInactive = "border-border/40 bg-muted/20 text-muted-foreground hover:border-border";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Re-analyze Video</h3>
            <p className="text-xs text-muted-foreground">Regenerate clips — free, no credit used</p>
          </div>
        </div>

        {/* Warning */}
        {existingClipCount > 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "hsl(var(--destructive)/0.08)", border: "1px solid hsl(var(--destructive)/0.25)" }}>
            <span className="text-destructive/80">⚠️ This will replace your current {existingClipCount} clip{existingClipCount !== 1 ? "s" : ""} and all highlight reels.</span>
          </div>
        )}

        {/* Clip Count */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Number of clips</label>
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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clip length</label>
          <div className="flex gap-2">
            {clipLengthOptions.map((opt) => (
              <button key={opt.value} onClick={() => setClipLength(opt.value)}
                className={`flex-1 flex flex-col items-center ${btnBase} ${clipLength === opt.value ? btnActive : btnInactive}`}>
                <span>{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption style</label>
          <div className="flex gap-2">
            {captionStyleOptions.map((opt) => (
              <button key={opt.value} onClick={() => setCaptionStyle(opt.value)}
                className={`flex-1 ${btnBase} ${captionStyle === opt.value ? btnActive : btnInactive}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="hero" size="sm" className="flex-1" onClick={handleReAnalyze} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Re-analyze</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReAnalyzeDialog;

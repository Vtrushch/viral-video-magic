import { useParams, useNavigate, Link } from "react-router-dom";
import { SUBTITLE_PRESETS, loadAllPresetFonts } from "@/config/subtitlePresets";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Clock, HardDrive, Calendar, Info, Monitor, User, Crop, ChevronLeft, ChevronRight, Maximize2, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Tables } from "@/integrations/supabase/types";
import { posthog } from "@/lib/posthog";
import { useTranslation } from "react-i18next";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const VideoConfig = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clipCount, setClipCount] = useState(10);
  const [clipLength, setClipLength] = useState("medium");
  const [captionStyle, setCaptionStyle] = useState("bold-pop");
  const [outputFormat, setOutputFormat] = useState("9:16");
  const [reframeMode, setReframeMode] = useState<"smart" | "full" | "center">("smart");

  const clipCountOptions = [
    { value: 5, desc: t("videoConfig.quickTesting") },
    { value: 10, desc: t("videoConfig.recommended") },
    { value: 15, desc: t("videoConfig.maxCoverage") },
  ];

  const clipLengthOptions = [
    { value: "short", label: t("videoConfig.short"), time: t("videoConfig.shortTime"), desc: t("videoConfig.shortDesc") },
    { value: "medium", label: t("videoConfig.medium"), time: t("videoConfig.mediumTime"), desc: t("videoConfig.mediumDesc") },
    { value: "long", label: t("videoConfig.long"), time: t("videoConfig.longTime"), desc: t("videoConfig.longDesc") },
  ];

  useEffect(() => {
    loadAllPresetFonts();
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from("videos").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setVideo(data);
      setLoading(false);
    });
  }, [id]);

  const handleStartAnalysis = async () => {
    if (!id) return;

    setSubmitting(true);
    const settings = {
      clipCount,
      clipLength,
      captionStyle,
      outputFormat,
      reframeMode,
    };

    const { data: verifyData, error: verifyError } = await supabase
      .from("videos")
      .select("id, file_path, status")
      .eq("id", id)
      .maybeSingle();

    if (verifyError) {
      toast.error(t("toasts.failedToVerify"));
      setSubmitting(false);
      return;
    }

    if (!verifyData) {
      toast.error(t("toasts.videoNotFound"));
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing", settings } as any)
      .eq("id", id);

    if (error) {
      toast.error(t("toasts.failedToStartAnalysis"));
      setSubmitting(false);
      return;
    }

    try {
      const modalResponse = await apiFetch('/analyze', { video_id: id });
      if (!modalResponse.ok) {
        const errorText = await modalResponse.text();
        console.error('Modal API error:', errorText);
      }
    } catch (modalError) {
      console.error('Modal connection error:', modalError);
    }

    posthog.capture('analysis_started', {
      clip_count: clipCount,
      clip_length: clipLength,
      caption_style: captionStyle,
      output_format: outputFormat,
      reframe_mode: reframeMode,
    });

    toast.success(t("toasts.analysisStarted"));
    navigate(`/dashboard/videos/${id}`);
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    const settings = {
      clipCount, clipLength, captionStyle, outputFormat, reframeMode,
    };
    await supabase.from("videos").update({ settings } as any).eq("id", id);
    toast.success(t("videoConfig.settingsSaved"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("common.loading")}
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p>{t("common.videoNotFound")}</p>
        <Button variant="ghost" asChild><Link to="/dashboard">{t("common.back")}</Link></Button>
      </div>
    );
  }

  const sectionCard = "glass-card rounded-2xl p-6 space-y-5";

  const radioCard = (active: boolean) =>
    `relative flex flex-col gap-1 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
      active
        ? "border-primary/50 shadow-[0_0_24px_-6px_hsl(349,100%,59%,0.2)]"
        : "border-border/40 hover:border-border"
    }`;

  const radioCardBg = (active: boolean) =>
    active
      ? "linear-gradient(135deg, hsl(349,100%,59%,0.08), hsl(270,95%,65%,0.08))"
      : "hsl(240,15%,10%,0.4)";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto w-full animate-fade-in">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t("videoConfig.backToVideos")}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("videoConfig.configureAnalysis")}</h1>
        <p className="text-muted-foreground text-sm mb-4">
          {t("videoConfig.setPreferences")} <span className="text-foreground font-medium">{video.title && !video.title.match(/^[0-9a-f-]{36}/) ? video.title : t("videoConfig.yourVideo")}</span>
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {video.duration && (
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{video.duration}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />{formatBytes(video.file_size)}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(video.created_at)}</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Clip Generation */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            🎬 {t("videoConfig.clipGeneration")}
          </h2>

          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">{t("videoConfig.numberOfClips")}</Label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {clipCountOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-xl p-2 sm:p-4 text-center transition-all border min-w-0 ${
                    clipCount === opt.value
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                      : "border-border/30 bg-muted/20 hover:border-border/60 text-muted-foreground"
                  }`}
                  onClick={() => setClipCount(opt.value)}
                >
                  <div className="text-lg sm:text-xl font-bold text-foreground">{opt.value}</div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("videoConfig.aiFindsMoments")}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">{t("videoConfig.clipLength")}</Label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {clipLengthOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-xl p-2 sm:p-4 text-center transition-all border flex flex-col items-center gap-0.5 sm:gap-1 min-w-0 ${
                    clipLength === opt.value
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                      : "border-border/30 bg-muted/20 hover:border-border/60 text-muted-foreground"
                  }`}
                  onClick={() => setClipLength(opt.value)}
                >
                  <div className="text-sm sm:text-base font-semibold text-foreground">{opt.label}</div>
                  <span className="text-[10px] sm:text-xs font-medium text-primary/80">{opt.time}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Caption Style */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            🎨 {t("videoConfig.captionStyle")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SUBTITLE_PRESETS.map((preset) => (
              <button
                key={preset.presetId}
                className={`${radioCard(captionStyle === preset.presetId)} items-center text-center`}
                style={{ background: radioCardBg(captionStyle === preset.presetId) }}
                onClick={() => setCaptionStyle(preset.presetId)}
              >
                <div
                  className="w-full rounded-lg p-3 flex items-center justify-center min-h-[48px]"
                  style={{
                    background: preset.backgroundOpacity > 0
                      ? preset.backgroundColor
                      : "hsl(0,0%,0%,0.4)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: preset.fontFamily,
                      fontWeight: preset.fontWeight,
                      fontSize: "14px",
                      color: preset.textColor,
                      textTransform: preset.textTransform as any,
                      letterSpacing: `${preset.letterSpacing}px`,
                      WebkitTextStroke: preset.strokeWidth > 0 ? `${Math.min(preset.strokeWidth, 1.5)}px ${preset.strokeColor}` : undefined,
                      textShadow: preset.shadow.enabled
                        ? `${preset.shadow.offsetX}px ${preset.shadow.offsetY}px ${preset.shadow.blur}px ${preset.shadow.color}`
                        : undefined,
                    }}
                  >
                    Sample <span style={{ color: preset.highlightColor }}>Text</span>
                  </span>
                </div>
                <span className="font-semibold text-foreground text-xs mt-1">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Output Format */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            {t("videoConfig.outputFormat")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("videoConfig.chooseAspect")}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setOutputFormat("9:16")}
              className={`rounded-xl p-4 text-center transition-all border ${
                outputFormat === "9:16"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              }`}
            >
              <div className={`w-6 h-10 border-2 rounded-sm mx-auto mb-2 ${outputFormat === "9:16" ? "border-primary" : "border-muted-foreground/40"}`} />
              <div className="text-sm font-bold text-foreground">9:16</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">TikTok, Reels, Shorts</p>
            </button>
            <button
              onClick={() => setOutputFormat("1:1")}
              className={`rounded-xl p-4 text-center transition-all border ${
                outputFormat === "1:1"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              }`}
            >
              <div className={`w-8 h-8 border-2 rounded-sm mx-auto mb-2 ${outputFormat === "1:1" ? "border-primary" : "border-muted-foreground/40"}`} />
              <div className="text-sm font-bold text-foreground">1:1</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Instagram Feed</p>
            </button>
            <button
              onClick={() => setOutputFormat("16:9")}
              className={`rounded-xl p-4 text-center transition-all border ${
                outputFormat === "16:9"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              }`}
            >
              <div className={`w-10 h-6 border-2 rounded-sm mx-auto mb-2 ${outputFormat === "16:9" ? "border-primary" : "border-muted-foreground/40"}`} />
              <div className="text-sm font-bold text-foreground">16:9</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">YouTube</p>
            </button>
          </div>
        </section>

        {/* Reframe Mode */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("videoConfig.reframeMode")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t("videoConfig.reframeDesc")}</p>
          <div className="grid grid-cols-3 gap-3">
            {/* Smart */}
            <button
              onClick={() => setReframeMode("smart")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                reframeMode === "smart"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              )}
            >
              <div className="relative w-10 h-14 rounded-md border-2 border-current flex items-center justify-center">
                <User className="w-4 h-4" />
                <ChevronLeft className="absolute -left-2 w-3 h-3 text-primary" />
                <ChevronRight className="absolute -right-2 w-3 h-3 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t("videoConfig.smart")}</p>
                <p className="text-[10px] text-muted-foreground">{t("videoConfig.smartDesc")}</p>
              </div>
            </button>
            {/* Full Frame */}
            <button
              onClick={() => setReframeMode("full")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                reframeMode === "full"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              )}
            >
              <div className="relative w-10 h-14 rounded-md border-2 border-current flex flex-col items-center justify-center overflow-hidden">
                <div className="w-full h-3 bg-current opacity-20 rounded-t-sm" />
                <div className="flex-1 w-full flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div className="w-full h-3 bg-current opacity-20 rounded-b-sm" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t("videoConfig.fullFrame")}</p>
                <p className="text-[10px] text-muted-foreground">{t("videoConfig.fullDesc")}</p>
              </div>
            </button>
            {/* Center */}
            <button
              onClick={() => setReframeMode("center")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                reframeMode === "center"
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                  : "border-border/30 bg-muted/20 hover:border-border/60"
              )}
            >
              <div className="relative w-10 h-14 rounded-md border-2 border-current flex items-center justify-center">
                <Crosshair className="w-4 h-4" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t("videoConfig.center")}</p>
                <p className="text-[10px] text-muted-foreground">{t("videoConfig.centerDesc")}</p>
              </div>
            </button>
          </div>
        </section>

        {/* Action */}
        <div className="space-y-3 pb-8">
          <div className="glass-card rounded-2xl p-5 flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-accent font-semibold">{t("videoConfig.analysisFreeUnlimited")}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="hero"
              size="lg"
              className="w-full sm:flex-1 min-h-[52px] text-base"
              onClick={handleStartAnalysis}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("common.starting")}</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> {t("videoConfig.startAnalysis")}</>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:flex-1"
              onClick={handleSaveDraft}
            >
              {t("videoConfig.saveDraft")}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {t("videoConfig.freeUnlimitedHint")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoConfig;
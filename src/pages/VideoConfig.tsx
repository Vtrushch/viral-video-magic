import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Clock, HardDrive, Calendar, ChevronDown, Info, Monitor, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Tables } from "@/integrations/supabase/types";
import { posthog } from "@/lib/posthog";

const clipCountOptions = [
  { value: 5, desc: "Quick · Best for testing" },
  { value: 10, desc: "Recommended" },
  { value: 15, desc: "Maximum coverage" },
];

const clipLengthOptions = [
  { value: "short", label: "Short", time: "15–30s", desc: "Perfect for TikTok" },
  { value: "medium", label: "Medium", time: "30–60s", desc: "Instagram Reels, YouTube Shorts" },
  { value: "long", label: "Long", time: "60–90s", desc: "YouTube, LinkedIn" },
];

const captionStyles = [
  {
    value: "hormozi",
    label: "Hormozi Style",
    desc: "Yellow highlights, bold, attention-grabbing",
    sample: (
      <span className="text-sm font-black tracking-tight text-white">
        Make More <span className="text-yellow-400 font-black">MONEY</span> Today
      </span>
    ),
  },
  {
    value: "mrbeast",
    label: "MrBeast Style",
    desc: "All caps, bold, high energy",
    sample: (
      <span className="text-sm font-black uppercase tracking-wider text-red-400">
        I GAVE AWAY $1,000,000
      </span>
    ),
  },
  {
    value: "minimal",
    label: "Minimal",
    desc: "Clean, simple, elegant",
    sample: (
      <span className="text-sm text-white/70 font-light">clean subtitles</span>
    ),
  },
  {
    value: "custom",
    label: "Custom Style",
    desc: "Customize colors in Remix Mode",
    badge: "Pro",
    sample: (
      <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">YOUR STYLE</span>
    ),
    sampleBg: "linear-gradient(135deg, hsl(349 100% 59% / 0.2), hsl(270 95% 65% / 0.2))",
  },
];

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
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [clipCount, setClipCount] = useState(10);
  const [clipLength, setClipLength] = useState("medium");
  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [outputFormat, setOutputFormat] = useState("9:16");
  const [includeTranscription, setIncludeTranscription] = useState(false);
  const [includeChapters, setIncludeChapters] = useState(false);
  const [smartReframe, setSmartReframe] = useState(false);

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
      includeTranscription,
      includeChapters,
      smartReframe,
    };

    const { data: verifyData, error: verifyError } = await supabase
      .from("videos")
      .select("id, file_path, status")
      .eq("id", id)
      .maybeSingle();

    if (verifyError) {
      toast.error("Failed to verify video record");
      setSubmitting(false);
      return;
    }

    if (!verifyData) {
      toast.error("Video record not found in database. Please re-upload.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing", settings } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to start analysis");
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
      smart_reframe: smartReframe,
    });

    toast.success("AI analysis started! This takes 2-3 minutes.");
    navigate(`/dashboard/videos/${id}`);
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    const settings = {
      clipCount, clipLength, captionStyle, outputFormat,
      includeTranscription, includeChapters, smartReframe,
    };
    await supabase.from("videos").update({ settings } as any).eq("id", id);
    toast.success("Settings saved as draft.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p>Video not found</p>
        <Button variant="ghost" asChild><Link to="/dashboard">Back</Link></Button>
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
        <ArrowLeft className="w-4 h-4" /> Back to videos
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Configure Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Set your preferences for <span className="text-foreground font-medium">{video.title && !video.title.match(/^[0-9a-f-]{36}/) ? video.title : "your video"}</span>
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
            🎬 Clip Generation
          </h2>

          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">Number of clips to generate</Label>
            <div className="grid grid-cols-3 gap-3">
              {clipCountOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-xl p-4 text-center transition-all border ${
                    clipCount === opt.value
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                      : "border-border/30 bg-muted/20 hover:border-border/60 text-muted-foreground"
                  }`}
                  onClick={() => setClipCount(opt.value)}
                >
                  <div className="text-xl font-bold text-foreground">{opt.value}</div>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">AI will find the most viral moments</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">Preferred clip length</Label>
            <div className="grid grid-cols-3 gap-3">
              {clipLengthOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-xl p-4 text-center transition-all border flex flex-col items-center gap-1 ${
                    clipLength === opt.value
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                      : "border-border/30 bg-muted/20 hover:border-border/60 text-muted-foreground"
                  }`}
                  onClick={() => setClipLength(opt.value)}
                >
                  <div className="font-semibold text-foreground">{opt.label}</div>
                  <span className="text-xs font-medium text-primary/80">{opt.time}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Caption Style */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            🎨 Caption Style
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {captionStyles.map((opt) => (
              <button
                key={opt.value}
                className={`${radioCard(captionStyle === opt.value)} items-start`}
                style={{ background: radioCardBg(captionStyle === opt.value) }}
                onClick={() => {
                  if (opt.value === "custom") {
                    toast.info("Custom styles available on Pro plan");
                    return;
                  }
                  setCaptionStyle(opt.value);
                }}
              >
                <div className="w-full rounded-lg p-3 flex items-center justify-center min-h-[48px]"
                  style={{ background: (opt as any).sampleBg || "hsl(0,0%,0%,0.4)" }}
                >
                  {opt.sample}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-foreground text-sm">{opt.label}</span>
                  {opt.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full gradient-bg text-primary-foreground">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Output Format */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Output Format
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose the aspect ratio for your clips
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

        {/* Smart Reframing */}
        <section className={sectionCard}>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Smart Reframing</p>
                <p className="text-[11px] text-muted-foreground">
                  AI detects faces and keeps the speaker centered in frame
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {smartReframe && (
                <span className="text-[10px] text-muted-foreground">+30s</span>
              )}
              <Switch
                checked={smartReframe}
                onCheckedChange={setSmartReframe}
              />
            </div>
          </div>
        </section>

        {/* 4. Advanced Options */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <div className={sectionCard}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                ⚙️ Advanced Options
              </h2>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox checked={includeTranscription} onCheckedChange={(v) => setIncludeTranscription(!!v)} />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">Include full transcription</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox checked={includeChapters} onCheckedChange={(v) => setIncludeChapters(!!v)} />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">Generate chapter markers</span>
              </label>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 5. Action */}
        <div className="space-y-3 pb-8">
          <div className="glass-card rounded-2xl p-5 flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-accent font-semibold">Analysis is free — unlimited!</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleSaveDraft}
            >
              Save as Draft
            </Button>
            <Button
              variant="hero"
              size="lg"
              className="flex-1 min-h-[52px] text-base"
              onClick={handleStartAnalysis}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Start AI Analysis</>
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Free & unlimited — credits are only used when you render a clip
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoConfig;

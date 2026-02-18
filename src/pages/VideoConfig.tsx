import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Sparkles, Loader2, Clock, HardDrive, Calendar, ChevronDown, Zap, Globe, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useCredits } from "@/hooks/useCredits";

const clipCountOptions = [
  { value: 5, label: "5 clips", desc: "Quick · Best for testing" },
  { value: 10, label: "10 clips", desc: "Recommended" },
  { value: 15, label: "15 clips", desc: "Maximum coverage" },
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
      <span className="text-sm font-black tracking-tight">
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
      <span className="text-sm font-light tracking-wide italic opacity-90">
        This changed everything
      </span>
    ),
  },
  {
    value: "custom",
    label: "Custom Style",
    desc: "Design your own",
    badge: "Pro",
    sample: (
      <span className="text-sm opacity-50">Custom...</span>
    ),
  },
];

const languages = [
  { code: "en", label: "English", desc: "Original language", price: null },
  { code: "es", label: "Spanish", desc: "Auto-translate + captions", price: "+$0.10/clip" },
  { code: "fr", label: "French", desc: "Auto-translate + captions", price: "+$0.10/clip" },
  { code: "de", label: "German", desc: "Auto-translate + captions", price: "+$0.10/clip" },
  { code: "pt", label: "Portuguese", desc: "Auto-translate + captions", price: "+$0.10/clip" },
  { code: "ja", label: "Japanese", desc: "Auto-translate + captions", price: "+$0.10/clip" },
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
  const { credits, loading: creditsLoading, refetch: refetchCredits } = useCredits();

  const [clipCount, setClipCount] = useState(10);
  const [clipLength, setClipLength] = useState("medium");
  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["en"]);
  const [includeTranscription, setIncludeTranscription] = useState(false);
  const [includeChapters, setIncludeChapters] = useState(false);
  const [includeBroll, setIncludeBroll] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("videos").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setVideo(data);
      setLoading(false);
    });
  }, [id]);

  const toggleLang = (code: string) => {
    if (code === "en") return;
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  };

  const extraLangs = selectedLangs.filter((l) => l !== "en").length;
  const estimatedCredits = useMemo(() => {
    return clipCount * (1 + extraLangs * 0.1);
  }, [clipCount, extraLangs]);

  const handleStartAnalysis = async () => {
    if (!id) return;

    // Credit check
    if (!credits || credits.remaining <= 0) {
      toast.error("No credits remaining. Upgrade your plan or contact support.");
      return;
    }

    setSubmitting(true);
    const settings = {
      clipCount,
      clipLength,
      captionStyle,
      languages: selectedLangs,
      includeTranscription,
      includeChapters,
      includeBroll,
    };

    // Log Supabase URL for cross-checking with Modal secrets
    console.log('🔗 Supabase URL used by Lovable:', import.meta.env.VITE_SUPABASE_URL);

    // Pre-check: verify the video row exists in Supabase before calling Modal
    const { data: verifyData, error: verifyError } = await supabase
      .from("videos")
      .select("id, file_path, status")
      .eq("id", id)
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Pre-check query error:', verifyError);
      toast.error("Failed to verify video record");
      setSubmitting(false);
      return;
    }

    if (!verifyData) {
      console.error('❌ VIDEO NOT FOUND in Supabase! id:', id);
      toast.error("Video record not found in database. Please re-upload.");
      setSubmitting(false);
      return;
    }

    console.log('✅ Pre-check: video exists in Supabase:', {
      id: verifyData.id,
      file_path: verifyData.file_path,
      status: verifyData.status,
    });

    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing", settings } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to start analysis");
      setSubmitting(false);
      return;
    }

    // Trigger Modal analysis via HTTP webhook
    const requestBody = { video_id: id };
    console.log('📤 Calling Modal webhook with body:', JSON.stringify(requestBody));
    console.log('📤 video_id type:', typeof id, '| value:', id);

    try {
      const modalResponse = await fetch('https://vtrushch--cutviral-worker-webhook.modal.run/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!modalResponse.ok) {
        const errorText = await modalResponse.text()
        console.error('Modal API error:', errorText)
      } else {
        const result = await modalResponse.json()
        console.log('✅ Modal analysis triggered:', result)
      }
    } catch (modalError) {
      console.error('❌ Modal connection error:', modalError)
      // Don't block UI - analysis will still work
    }

    // Deduct 1 credit atomically via RPC-style raw update
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.rpc('increment_used_credits' as any, { _user_id: userData.user.id });
      refetchCredits();
    }

    toast.success("AI analysis started! This takes 2-3 minutes.");
    navigate(`/dashboard/videos/${id}`);
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    const settings = {
      clipCount, clipLength, captionStyle,
      languages: selectedLangs,
      includeTranscription, includeChapters, includeBroll,
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
      {/* Back */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to videos
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Configure Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Set your preferences for <span className="text-foreground font-medium">{video.title}</span>
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

          {/* Clip Count */}
          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">Number of clips to generate</Label>
            <div className="grid grid-cols-3 gap-3">
              {clipCountOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={radioCard(clipCount === opt.value)}
                  style={{ background: radioCardBg(clipCount === opt.value) }}
                  onClick={() => setClipCount(opt.value)}
                >
                  <span className="text-lg font-bold text-foreground">{opt.value}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">AI will find the most viral moments</p>
          </div>

          {/* Clip Length */}
          <div>
            <Label className="text-sm font-medium text-foreground/80 mb-3 block">Preferred clip length</Label>
            <div className="grid grid-cols-3 gap-3">
              {clipLengthOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={radioCard(clipLength === opt.value)}
                  style={{ background: radioCardBg(clipLength === opt.value) }}
                  onClick={() => setClipLength(opt.value)}
                >
                  <span className="font-semibold text-foreground">{opt.label}</span>
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
                {/* Preview box */}
                <div className="w-full rounded-lg p-3 flex items-center justify-center min-h-[48px]"
                  style={{ background: "hsl(0,0%,0%,0.4)" }}
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

        {/* 3. Languages */}
        <section className={sectionCard}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            🌍 Languages
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => {
              const isEn = lang.code === "en";
              const active = selectedLangs.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  className={radioCard(active)}
                  style={{ background: radioCardBg(active) }}
                  onClick={() => toggleLang(lang.code)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-foreground text-sm">{lang.label}</span>
                    {lang.price && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {lang.price}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isEn ? "Original language" : lang.desc}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-2 rounded-xl p-3 text-xs"
            style={{ background: "hsl(177,100%,39%,0.06)", border: "1px solid hsl(177,100%,39%,0.15)" }}
          >
            <Globe className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <span className="text-accent/80">
              <strong className="text-accent">Pro Tip:</strong> Multi-language clips reach 5× more audience!
            </span>
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
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox checked={includeBroll} onCheckedChange={(v) => setIncludeBroll(!!v)} />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">Auto-suggest B-roll moments</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">Beta</span>
                </div>
              </label>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 5. Cost Estimate */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Estimated Cost
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{clipCount} clips × {selectedLangs.length === 1 ? "English" : `${selectedLangs.length} languages`}</span>
              <span>{estimatedCredits.toFixed(estimatedCredits % 1 === 0 ? 0 : 1)} credits</span>
            </div>
            <div className="border-t border-border/40 pt-2 flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>{estimatedCredits.toFixed(estimatedCredits % 1 === 0 ? 0 : 1)} credits</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" /> 
            This will use 1 credit. {creditsLoading ? "Loading credits..." : credits ? `You have ${credits.remaining} credits remaining.` : "Credits unavailable."}
          </p>
          {credits && credits.remaining <= 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "hsl(0,62%,30%,0.2)", border: "1px solid hsl(0,62%,30%,0.3)" }}>
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive">No credits remaining. Upgrade your plan to continue.</span>
            </div>
          )}
        </div>

        {/* 6. Action Buttons */}
        <div className="flex gap-3 pb-8">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleSaveDraft}
          >
            Save as Draft
          </Button>
          {credits && credits.remaining <= 0 ? (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 opacity-60"
              disabled
            >
              No Credits
            </Button>
          ) : (
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              onClick={handleStartAnalysis}
              disabled={submitting || selectedLangs.length === 0 || creditsLoading}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Start AI Analysis →</>
              )}
            </Button>
          )}
          {credits && credits.remaining <= 0 && (
            <Button variant="hero" size="lg" className="flex-1" asChild>
              <Link to="/dashboard/upgrade">Upgrade Plan</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoConfig;

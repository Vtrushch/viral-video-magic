import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Play, Download, Star, Clock, Calendar, Settings2,
  Loader2, AlertCircle, HardDrive, RotateCcw, CheckCircle2, Sparkles,
  Search, Zap, Film, ChevronRight, XCircle, Eye, Pencil, RefreshCw, Clapperboard,
  Scissors, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadClip, clipFilename } from "@/lib/downloadClip";
import { apiFetch } from "@/lib/api";
import type { Tables } from "@/integrations/supabase/types";
import ClipPreviewModal from "@/components/dashboard/ClipPreviewModal";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import HighlightReelCard from "@/components/dashboard/HighlightReelCard";
import RenderCreditDialog from "@/components/dashboard/RenderCreditDialog";
import ReAnalyzeDialog from "@/components/dashboard/ReAnalyzeDialog";
import { useCredits } from "@/hooks/useCredits";
import { posthog } from "@/lib/posthog";

const scoreColor = (score: number) => {
  if (score >= 8) return "bg-accent/15 text-accent";
  if (score >= 6) return "bg-secondary/15 text-secondary";
  return "bg-muted text-muted-foreground";
};

const statusConfig: Record<string, { class: string; label: string }> = {
  uploading: { class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Uploaded" },
  downloading: { class: "bg-secondary/15 text-secondary border-secondary/20", label: "Downloading" },
  analyzing: { class: "bg-secondary/15 text-secondary border-secondary/20", label: "Analyzing" },
  ready: { class: "bg-accent/15 text-accent border-accent/20", label: "Ready" },
  failed: { class: "bg-destructive/15 text-destructive border-destructive/20", label: "Failed" },
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Downloading State (YouTube import) ─── */
const DownloadingState = ({ video }: { video: Tables<"videos"> }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const channel = supabase
      .channel(`video-download-${video.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "videos",
        filter: `id=eq.${video.id}`,
      }, (payload: any) => {
        if (payload.new.status !== "downloading") {
          window.location.reload();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [video.id]);

  return (
    <div className="glass-card rounded-2xl p-10 text-center space-y-6">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full gradient-bg opacity-20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary">
          <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">Downloading from YouTube...</h2>
        <p className="text-sm text-muted-foreground">This usually takes 1–2 minutes depending on video length</p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
        style={{ background: "hsl(177,100%,39%,0.06)", border: "1px solid hsl(177,100%,39%,0.15)" }}
      >
        <span className="text-accent">💡</span>
        <span className="text-accent/80">You can close this page. We'll notify you when it's ready!</span>
      </div>
    </div>
  );
};

/* ─── Uploaded State ─── */
const UploadedState = ({ video }: { video: Tables<"videos"> }) => {
  const navigate = useNavigate();
  const settings = video.settings as any;

  const handleStartDefault = async () => {
    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing" } as any)
      .eq("id", video.id);
    if (error) {
      toast.error("Failed to start analysis");
      return;
    }
    toast.success("AI analysis started!");
    window.location.reload();
  };

  return (
    <div className="glass-card rounded-2xl p-10 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto shadow-lg glow-primary">
        <Settings2 className="w-8 h-8 text-primary-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">Configure Your Video Settings</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Choose how you want AI to process your video before starting analysis
        </p>
      </div>

      {settings && (
        <div className="glass-card rounded-xl p-5 text-left max-w-sm mx-auto space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Settings</h3>
          <div className="space-y-1.5 text-sm text-foreground/80">
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Generate {settings.clipCount || 10} clips</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {settings.clipLength || "medium"} length</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {settings.captionStyle || "hormozi"} captions</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {(settings.languages || ["en"]).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button variant="hero" size="lg" onClick={() => navigate(`/dashboard/videos/configure/${video.id}`)}>
          <Settings2 className="w-4 h-4 mr-2" /> Configure Settings
        </Button>
        <Button variant="outline" size="lg" onClick={handleStartDefault}>
          <Sparkles className="w-4 h-4 mr-2" /> Start with Defaults
        </Button>
      </div>
    </div>
  );
};

/* ─── Smart time estimate based on file size ─── */
function getAnalysisTimeEstimate(fileSizeBytes: number | null): string {
  if (!fileSizeBytes) return "Usually takes 2–3 minutes";
  const mb = fileSizeBytes / (1024 * 1024);
  if (mb < 20) return "Usually takes 1–2 minutes";
  if (mb < 50) return "Usually takes 2–3 minutes";
  if (mb < 100) return "Usually takes 3–5 minutes";
  if (mb < 200) return "Usually takes 5–8 minutes";
  return "Usually takes 8–15 minutes";
}

/* ─── Analyzing State ─── */
const AnalyzingState = ({ video }: { video: Tables<"videos"> }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notified, setNotified] = useState(() =>
    localStorage.getItem(`notify_on_complete_${video.id}`) === "true"
  );

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time-based phase label
  const phaseLabel = (() => {
    if (elapsedSeconds < 30) return "Uploading to AI...";
    if (elapsedSeconds < 120) return "AI is watching your video...";
    if (elapsedSeconds < 240) return "Finding the best moments...";
    return "Almost done!";
  })();

  useEffect(() => {
    const channel = supabase
      .channel(`video-${video.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "videos",
        filter: `id=eq.${video.id}`,
      }, (payload: any) => {
        // Let parent VideoDetail handle state transition via its own subscription
        // No window.location.reload() — React will unmount AnalyzingState naturally
      })
      .subscribe();

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 4 + 1;
        if (next > 30 && currentStep < 2) setCurrentStep(2);
        if (next > 60 && currentStep < 3) setCurrentStep(3);
        if (next > 85 && currentStep < 4) setCurrentStep(4);
        return Math.min(next, 95);
      });
    }, 2500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [video.id, currentStep]);

  const handleNotify = () => {
    localStorage.setItem(`notify_on_complete_${video.id}`, "true");
    setNotified(true);
    toast.success("We'll notify you when your clips are ready!");
  };

  const steps = [
    { icon: CheckCircle2, label: t("analyzing.videoUploaded"), done: true },
    { icon: Search, label: t("analyzing.analyzingContent"), done: currentStep > 1 },
    { icon: Zap, label: t("analyzing.findingMoments"), done: currentStep > 2 },
    { icon: Film, label: t("analyzing.generatingClips"), done: currentStep > 3 },
  ];

  const timeEstimate = getAnalysisTimeEstimate(video.file_size);

  return (
    <div className="glass-card rounded-2xl p-10 text-center space-y-8">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full gradient-bg opacity-20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary">
          <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("analyzing.title")}</h2>
        <p className="text-sm text-muted-foreground">{timeEstimate}</p>
        <p className="text-xs mt-1.5 font-medium" style={{ color: "hsl(349,100%,72%)" }}>{phaseLabel}</p>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto space-y-2">
        <Progress value={progress} className="h-2.5" />
        <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
      </div>

      {/* Steps */}
      <div className="max-w-xs mx-auto space-y-3 text-left">
        {steps.map((step, i) => {
          const active = i === currentStep;
          const done = step.done || i < currentStep;
          const Icon = step.icon;
          return (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              done ? "text-accent" : active ? "text-foreground" : "text-muted-foreground/50"
            }`}>
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-border/50 flex-shrink-0" />
              )}
              <span className={done ? "line-through opacity-60" : ""}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
        style={{ background: "hsl(177,100%,39%,0.06)", border: "1px solid hsl(177,100%,39%,0.15)" }}
      >
        <span className="text-accent">💡</span>
        <span className="text-accent/80">{t("analyzing.canClose")}</span>
      </div>

      {/* Notification button */}
      <div>
        {notified ? (
          <div className="inline-flex items-center gap-2 text-xs text-accent/80 px-4 py-2.5 rounded-xl"
            style={{ background: "hsl(349,100%,59%,0.06)", border: "1px solid hsl(349,100%,59%,0.15)" }}>
            <CheckCircle2 className="w-4 h-4 text-accent" />
            We'll notify you when your clips are ready!
          </div>
        ) : (
          <button
            onClick={handleNotify}
            className="inline-flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: "hsl(349,100%,59%,0.08)", border: "1px solid hsl(349,100%,59%,0.2)", color: "hsl(349,100%,72%)" }}
          >
            📧 Get notified when done
          </button>
        )}
      </div>

      {/* Debug button - only in development */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'rgba(255,255,255,0.5)', 
            marginBottom: '0.5rem' 
          }}>
            🔧 Development Mode
          </p>
          <Button
            onClick={async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast.error("User not found");
                  return;
                }

                const { error: clipsError } = await supabase
                  .from("clips")
                  .insert([
                    {
                      video_id: video.id,
                      user_id: user.id,
                      title: "Top 5 Productivity Mistakes",
                      duration: "0:30",
                      viral_score: 9,
                      status: "preview",
                      thumbnail_url: video.thumbnail_url,
                    },
                    {
                      video_id: video.id,
                      user_id: user.id,
                      title: "The Secret to Success",
                      duration: "0:45",
                      viral_score: 8,
                      status: "preview",
                      thumbnail_url: video.thumbnail_url,
                    },
                    {
                      video_id: video.id,
                      user_id: user.id,
                      title: "Game Changing Strategy",
                      duration: "0:50",
                      viral_score: 7,
                      status: "preview",
                      thumbnail_url: video.thumbnail_url,
                    }
                  ]);

                if (clipsError) throw clipsError;

                const { error: videoError } = await supabase
                  .from("videos")
                  .update({ status: "analyzing" })
                  .eq("id", video.id);

                if (videoError) throw videoError;

                toast.success("Test clips created!");
                navigate(`/dashboard/videos/review/${video.id}`);
              } catch (error) {
                console.error("Debug error:", error);
                toast.error("Failed to create test clips");
              }
            }}
            className="w-full"
            variant="outline"
          >
            Skip to Review (Create Test Clips)
          </Button>
        </div>
      )}
    </div>
  );
};

/* ─── Ready State ─── */
const ReadyState = ({ video, clips: initialClips, onReAnalyze }: { video: Tables<"videos">; clips: Tables<"clips">[]; onReAnalyze?: () => void }) => {
  const navigate = useNavigate();
  const [clips, setClips] = useState(initialClips);
  const [previewClip, setPreviewClip] = useState<Tables<"clips"> | null>(null);
  const [renderingIds, setRenderingIds] = useState<Set<string>>(new Set());
  const [videoSignedUrl, setVideoSignedUrl] = useState<string | null>(null);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [reels, setReels] = useState<any[]>([]);
  const [creditDialog, setCreditDialog] = useState<{ type: "single"; clip: Tables<"clips"> } | { type: "all"; clips: Tables<"clips">[] } | null>(null);
  const [creditConfirmLoading, setCreditConfirmLoading] = useState(false);
  const [reAnalyzeOpen, setReAnalyzeOpen] = useState(false);
  const { credits, refetch: refetchCredits } = useCredits();
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const manualVideoRef = useRef<HTMLVideoElement>(null);
  const settings = video.settings as any;

  // Manual clip creator state
  const [showManualCreator, setShowManualCreator] = useState(false);

  // Smart Reel state
  const [showSmartReel, setShowSmartReel] = useState(false);
  const [reelStyle, setReelStyle] = useState<"narrative" | "best_moments" | "energy">("narrative");
  const [targetDuration, setTargetDuration] = useState(60);
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [manualStart, setManualStart] = useState(0);
  const [manualEnd, setManualEnd] = useState(30);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCurrentTime, setManualCurrentTime] = useState(0);
  const [manualVideoDuration, setManualVideoDuration] = useState(100);

  // If parent passes new clips (e.g. after realtime fetch), update local state
  useEffect(() => {
    if (initialClips.length > 0) setClips(initialClips);
  }, [initialClips]);

  // Load signed URL for main video player
  useEffect(() => {
    if (!video.file_path) return;
    supabase.storage
      .from("raw-videos")
      .createSignedUrl(video.file_path, 3600)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) setVideoSignedUrl(data.signedUrl);
      });
  }, [video.file_path]);

  // Load highlight reels for this video
  const fetchReels = useCallback(async () => {
    const { data } = await supabase
      .from("highlight_reels" as any)
      .select("*")
      .eq("video_id", video.id)
      .order("created_at", { ascending: false });
    if (data) setReels(data);
  }, [video.id]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  // Realtime subscription for highlight_reels
  useEffect(() => {
    const channel = supabase
      .channel(`highlight-reels-${video.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "highlight_reels",
          filter: `video_id=eq.${video.id}`,
        },
        (payload: any) => {
          console.log("Reel updated:", payload);
          fetchReels();
          if (payload.new?.status === "ready") {
            toast.success(`🎬 Highlight reel ready: ${payload.new.title}`, { duration: 5000 });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [video.id, fetchReels]);

  // Poll every 5s for any reel that is still rendering/pending (fallback)
  useEffect(() => {
    const hasActiveReel = reels.some((r) => r.status === "rendering" || r.status === "pending");
    if (!hasActiveReel) return;
    const interval = setInterval(() => fetchReels(), 5000);
    return () => clearInterval(interval);
  }, [video.id, reels, fetchReels]);

  // Poll every 5s for any clip that is still rendering
  useEffect(() => {
    const hasRenderingClip = clips.some((c) => c.status === "rendering") || renderingIds.size > 0;
    if (!hasRenderingClip) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("clips")
        .select("*")
        .eq("video_id", video.id)
        .order("viral_score", { ascending: false });
      if (!data) return;
      setClips((prev) => {
        const updated = data as Tables<"clips">[];
        updated.forEach((newClip) => {
          const old = prev.find((c) => c.id === newClip.id);
          if (old && old.status === "rendering" && newClip.status === "ready") {
            toast.success(`✅ Clip ready: ${newClip.title}`);
            setRenderingIds((ids) => { const n = new Set(ids); n.delete(newClip.id); return n; });
            refetchCredits();
          } else if (old && old.status === "rendering" && newClip.status === "failed") {
            toast.error("Rendering failed", {
              description: "Your credit was NOT charged. Try again or contact support@hookcut.com",
              duration: 8000,
            });
            setRenderingIds((ids) => { const n = new Set(ids); n.delete(newClip.id); return n; });
          }
        });
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [video.id, clips, renderingIds]);

  const renderClipActual = useCallback(async (clip: Tables<"clips">) => {
    if (!video.file_path) { toast.error("Video file not found"); return; }
    setRenderingIds(prev => new Set(prev).add(clip.id));
    try {
      const res = await apiFetch("/render", {
        clip_id: clip.id,
        video_storage_path: video.file_path,
        start_time: parseFloat(clip.start_time || "0"),
        end_time: parseFloat(clip.end_time || "0"),
        caption_style: settings?.captionStyle || "hormozi",
      });
      if (!res.ok) throw new Error("Render request failed");
      await supabase.from("clips").update({ status: "rendering" } as any).eq("id", clip.id);
      setClips(prev => prev.map(c => c.id === clip.id ? { ...c, status: "rendering" } : c));
    } catch {
      setRenderingIds(prev => { const n = new Set(prev); n.delete(clip.id); return n; });
      toast.error("Something went wrong", {
        description: "Please try again. If the problem persists, contact support@hookcut.com",
      });
    }
  }, [video, settings]);

  // Trigger render — backend handles credit deduction after successful render
  const deductAndRender = useCallback(async (clipsToRender: Tables<"clips">[]) => {
    await Promise.all(clipsToRender.map((clip) => renderClipActual(clip)));
  }, [renderClipActual]);

  // Credit-gated render single clip
  const renderClip = useCallback((clip: Tables<"clips">) => {
    setCreditDialog({ type: "single", clip });
  }, []);

  // Show loading if clips haven't arrived yet
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading clips...</p>
      </div>
    );
  }

  const toggleMainPlayer = () => {
    const el = mainVideoRef.current;
    if (!el) return;
    if (playerPlaying) { el.pause(); setPlayerPlaying(false); }
    else { el.play().catch(() => {}); setPlayerPlaying(true); }
  };


  // Credit-gated render all
  const renderAll = () => {
    const pending = clips.filter(c => c.status === "pending");
    if (pending.length === 0) { toast.info("No pending clips to render"); return; }
    setCreditDialog({ type: "all", clips: pending });
  };

  const handleCreditConfirm = async () => {
    if (!creditDialog) return;
    setCreditConfirmLoading(true);
    if (creditDialog.type === "single") {
      await deductAndRender([creditDialog.clip]);
    } else {
      await deductAndRender(creditDialog.clips);
    }
    setCreditConfirmLoading(false);
    setCreditDialog(null);
  };

  // Render time estimate for a clip based on duration_seconds
  const getRenderTimeEstimate = (clip: Tables<"clips">) => {
    const dur = clip.duration_seconds ?? 0;
    if (dur < 30) return "~30 sec";
    if (dur < 60) return "~1 min";
    return "~2 min";
  };

  const handleDownload = async (clip: Tables<"clips">) => {
    if (!clip.file_path) return;
    try {
      posthog.capture('clip_downloaded', { clip_id: clip.id });
      await downloadClip(clip.file_path, clipFilename(clip.title, clip.id));
    } catch {
      // downloadClip already shows error toast
    }
  };

  const formatTime = (s: string | null) => {
    if (!s) return "0:00";
    const sec = parseFloat(s);
    const m = Math.floor(sec / 60);
    const r = Math.floor(sec % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const pendingCount = clips.filter(c => c.status === "pending").length;
  const readyCount = clips.filter(c => c.status === "ready").length;

  const formatTimeManual = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreateManualClip = async () => {
    const clipDuration = manualEnd - manualStart;
    if (clipDuration < 5) {
      toast.error("Clip too short", { description: "Minimum clip length is 5 seconds" });
      return;
    }
    if (clipDuration > 180) {
      toast.error("Clip too long", { description: "Maximum clip length is 3 minutes" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    const { data, error } = await supabase.from("clips").insert({
      user_id: user.id,
      video_id: video.id,
      title: manualTitle || `Manual clip ${formatTimeManual(manualStart)}-${formatTimeManual(manualEnd)}`,
      start_time: String(manualStart),
      end_time: String(manualEnd),
      duration_seconds: Math.round(clipDuration),
      duration: formatTimeManual(clipDuration),
      viral_score: 0,
      viral_analysis: {
        hook_strength: 0,
        reason: "Manually created by user",
        detected_language: "en",
        face_x: 0.5,
        reframe_mode: "center",
        manual: true,
      },
      status: "pending",
    } as any).select().single();

    if (error) {
      toast.error("Failed to create clip", { description: error.message });
      return;
    }

    toast.success("Clip created!", { description: "Generating subtitles... This takes a few seconds." });
    setShowManualCreator(false);
    setManualTitle("");
    setManualStart(0);
    setManualEnd(30);
    // Refresh clips
    const { data: freshClips } = await supabase.from("clips").select("*").eq("video_id", video.id).order("viral_score", { ascending: false });
    if (freshClips) setClips(freshClips);

    // Immediately transcribe the clip for subtitles
    try {
      await apiFetch("/transcribe-clip", {
        clip_id: data.id,
        video_storage_path: video.file_path,
        start_time: manualStart,
        end_time: manualEnd,
      });

      // Poll for transcription completion (check every 2s, max 30s)
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const { data: updatedClip } = await supabase
          .from("clips")
          .select("transcription")
          .eq("id", data.id)
          .single();

        if (updatedClip?.transcription || attempts > 15) {
          clearInterval(pollInterval);
          if (updatedClip?.transcription) {
            toast.success("Subtitles ready!", { description: "You can now edit and render your clip." });
          }
          // Refresh to show updated clip with transcription
          const { data: refreshedClips } = await supabase.from("clips").select("*").eq("video_id", video.id).order("viral_score", { ascending: false });
          if (refreshedClips) setClips(refreshedClips);
        }
      }, 2000);
    } catch (transcribeError) {
      console.error("Transcription request failed:", transcribeError);
      // Non-blocking — clip is created, transcription can happen during render as fallback
      toast.info("Clip created", { description: "Subtitles will be generated when you render." });
    }
  };

  const statusDot = (status: string) => {
    if (status === "ready") return "bg-accent";
    if (status === "rendering") return "bg-secondary animate-pulse";
    if (status === "failed") return "bg-destructive";
    return "bg-muted-foreground/40";
  };

  const scoreCircle = (score: number) => {
    if (score >= 8) return "bg-accent/20 text-accent border-accent/30";
    if (score >= 6) return "bg-secondary/20 text-secondary border-secondary/30";
    return "bg-muted text-muted-foreground border-border";
  };

  if (clips.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">No clips generated</h2>
        <p className="text-sm text-muted-foreground">Something went wrong during processing.</p>
        <Button variant="hero"><RotateCcw className="w-4 h-4 mr-2" /> Retry Analysis</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video player */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="aspect-video relative bg-black">
          {videoSignedUrl ? (
            <video
              ref={mainVideoRef}
              src={videoSignedUrl}
              className="w-full h-full object-contain"
              onEnded={() => setPlayerPlaying(false)}
              onPause={() => setPlayerPlaying(false)}
              onPlay={() => setPlayerPlaying(true)}
              playsInline
              preload="auto"
              controls={playerPlaying}
            />
          ) : video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <Film className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          {!playerPlaying && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary"
                  onClick={toggleMainPlayer}
                >
                  <Play className="w-6 h-6 text-primary-foreground ml-1" />
                </div>
              </div>
              {/* Bottom overlay info */}
              <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{video.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {video.duration_seconds && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(video.duration_seconds)}</span>
                      )}
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatBytes(video.file_size)}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(video.created_at)}</span>
                    </div>
                  </div>
                  <Badge className="bg-accent/15 text-accent border-accent/20 border text-xs">Ready</Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Generated Clips ({clips.length})</h3>
          {readyCount > 0 && (
            <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">{readyCount} ready</span>
          )}
          {/* Render-All progress tracker */}
          {clips.some(c => c.status === "rendering" || renderingIds.has(c.id)) && (
            <span className="text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ✅ {readyCount}/{clips.length} ready &nbsp;⏳ {clips.filter(c => c.status === "rendering" || renderingIds.has(c.id)).length} rendering...
            </span>
          )}
          {readyCount === clips.length && clips.length > 0 && !clips.some(c => c.status === "rendering" || renderingIds.has(c.id)) && (
            <span className="text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-full">✅ {clips.length}/{clips.length} all done! 🎉</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowManualCreator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5" />
            Create Clip Manually
          </button>
          {clips.length >= 2 && (
            <>
              <button
                onClick={() => setShowSmartReel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Smart Reel
              </button>
              <Button
                variant="hero-outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => navigate(`/dashboard/highlight-reel/new/${video.id}`)}
              >
                <Clapperboard className="w-4 h-4 mr-1.5" /> Create Highlight Reel
              </Button>
            </>
          )}
          <Button
            variant="hero-outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => navigate(`/dashboard/videos/review/${video.id}`)}
          >
            <Eye className="w-4 h-4 mr-1.5" /> Review & Select
          </Button>
          <Button
            variant="hero"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={renderAll}
            disabled={pendingCount === 0 || (credits?.remaining ?? 0) === 0}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            {(credits?.remaining ?? 0) === 0
              ? "No credits"
              : pendingCount > 0
              ? (credits?.remaining ?? 0) >= pendingCount
                ? `Render All (${pendingCount} clips)`
                : `Need ${pendingCount - (credits?.remaining ?? 0)} more credits`
              : "All Rendered"}
          </Button>
          {(credits?.remaining ?? 0) === 0 && pendingCount > 0 && (
            <a href="/dashboard/upgrade" className="text-[10px] text-primary hover:underline self-center">
              Upgrade →
            </a>
          )}
        </div>
      </div>

      {/* Clips grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...clips].sort((a, b) => {
          const statusOrder: Record<string, number> = { ready: 0, rendering: 1, pending: 2, failed: 3 };
          const orderA = statusOrder[a.status] ?? 2;
          const orderB = statusOrder[b.status] ?? 2;
          if (orderA !== orderB) return orderA - orderB;
          return (b.viral_score ?? 0) - (a.viral_score ?? 0);
        }).map((clip) => {
          const isRendering = clip.status === "rendering" || renderingIds.has(clip.id);
          const isReady = clip.status === "ready";
          const isFailed = clip.status === "failed";
          return (
            <div key={clip.id} className="glass-card-hover rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                {/* 9:16 thumbnail placeholder */}
                  <div
                    className="w-16 h-28 rounded-lg flex-shrink-0 overflow-hidden relative cursor-pointer"
                    style={{ background: "linear-gradient(180deg, hsl(240,15%,14%) 0%, hsl(240,15%,10%) 100%)" }}
                    onClick={() => setPreviewClip(clip)}
                  >
                    <ClipVideoThumbnail
                        renderedUrl={clip.status === "ready" && clip.file_path ? clip.file_path : null}
                        filePath={clip.status !== "ready" ? video.file_path : null}
                        startTime={clip.start_time}
                        fallbackImageUrl={clip.thumbnail_url || video.thumbnail_url || null}
                        faceX={(clip.viral_analysis as any)?.face_x ?? 0.5}
                        reframeMode={settings?.reframeMode || "center"}
                        alt={clip.title}
                        className="w-full h-full"
                      />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
                  </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(clip.status)}`} />
                      <h4 className="text-sm font-semibold text-foreground truncate">{clip.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{formatTime(clip.start_time)} → {formatTime(clip.end_time)}</span>
                      {clip.duration_seconds != null && (
                        <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground text-[10px] font-medium">{clip.duration_seconds}s</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setPreviewClip(clip)}
                    >
                      <Eye className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/dashboard/videos/edit/${clip.id}`)}
                    >
                      <Pencil className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">Edit</span>
                    </Button>
                    {isReady && clip.file_path ? (
                      <>
                        <button
                          className="inline-flex items-center gap-1 h-7 min-h-[44px] px-2 text-xs text-accent hover:text-accent rounded-md hover:bg-accent/10 transition-colors"
                          onClick={() => handleDownload(clip)}
                        >
                          <Download className="w-3 h-3 sm:mr-0.5" />
                          <span className="sm:hidden">Save</span>
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        {(credits?.plan === "free" || !credits?.plan) && (
                          <span className="text-[9px] text-yellow-500/70 bg-yellow-500/10 rounded px-1.5 py-0.5">
                            Watermark
                          </span>
                        )}
                      </>
                    ) : isFailed ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-destructive font-medium">Rendering failed</span>
                        <span className="text-[10px] text-muted-foreground">Credit not charged</span>
                        <button
                          onClick={() => renderClip(clip)}
                          className="mt-0.5 text-[11px] text-primary hover:underline text-left"
                        >
                          ↻ Try Again
                        </button>
                      </div>
                    ) : (
                      (credits?.remaining ?? 0) > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
                          onClick={() => renderClip(clip)}
                          disabled={isRendering}
                        >
                          {isRendering ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Rendering ({getRenderTimeEstimate(clip)})</>
                          ) : (
                            <><Sparkles className="w-3 h-3 mr-1" /> Render</>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">No credits</span>
                          <a href="/dashboard/upgrade" className="text-[10px] text-primary hover:underline">Upgrade →</a>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Viral score circle or manual badge */}
                {(clip.viral_analysis as any)?.manual ? (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 self-start">
                    <Scissors className="w-4 h-4 text-blue-400" />
                  </div>
                ) : clip.viral_score != null ? (
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 self-start ${scoreCircle(clip.viral_score)}`}>
                    <span className="text-sm font-bold">{clip.viral_score}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Clip Creator Modal */}
      {showManualCreator && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Create Clip Manually</h2>
              </div>
              <button onClick={() => setShowManualCreator(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="p-4">
              <div className="relative w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden">
                <video
                  ref={manualVideoRef}
                  src={videoSignedUrl || ""}
                  className="w-full h-auto"
                  playsInline
                  controls
                  preload="auto"
                  onTimeUpdate={(e) => setManualCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    setManualVideoDuration(e.currentTarget.duration);
                    setManualEnd(Math.min(30, e.currentTarget.duration));
                  }}
                />
              </div>
            </div>

            {/* Timeline & Controls */}
            <div className="px-4 pb-4 space-y-4">
              {/* Time display */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Selection: <span className="text-foreground font-mono">{formatTimeManual(manualStart)}</span> → <span className="text-foreground font-mono">{formatTimeManual(manualEnd)}</span>
                </span>
                <span className="text-primary font-medium">
                  {Math.round(manualEnd - manualStart)}s clip
                </span>
              </div>

              {/* Timeline bar */}
              <div className="relative h-12 bg-muted/20 rounded-lg overflow-hidden">
                <div
                  className="absolute h-full bg-primary/20 border-l-2 border-r-2 border-primary"
                  style={{
                    left: `${(manualStart / manualVideoDuration) * 100}%`,
                    width: `${((manualEnd - manualStart) / manualVideoDuration) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                  style={{ left: `${(manualCurrentTime / manualVideoDuration) * 100}%` }}
                />
              </div>

              {/* Start / End inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Start Time</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualStart(Math.max(0, manualStart - 1))} className="px-2 py-1 rounded border border-border/50 text-xs hover:border-primary/30 text-foreground">-1s</button>
                    <span className="text-sm font-mono text-foreground flex-1 text-center">{formatTimeManual(manualStart)}</span>
                    <button onClick={() => setManualStart(Math.min(manualEnd - 5, manualStart + 1))} className="px-2 py-1 rounded border border-border/50 text-xs hover:border-primary/30 text-foreground">+1s</button>
                    <button
                      onClick={() => { if (manualVideoRef.current) setManualStart(manualVideoRef.current.currentTime); }}
                      className="px-2 py-1 rounded border border-primary/30 text-primary text-xs hover:bg-primary/10"
                    >
                      Set to Current
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">End Time</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualEnd(Math.max(manualStart + 5, manualEnd - 1))} className="px-2 py-1 rounded border border-border/50 text-xs hover:border-primary/30 text-foreground">-1s</button>
                    <span className="text-sm font-mono text-foreground flex-1 text-center">{formatTimeManual(manualEnd)}</span>
                    <button onClick={() => setManualEnd(Math.min(manualVideoDuration, manualEnd + 1))} className="px-2 py-1 rounded border border-border/50 text-xs hover:border-primary/30 text-foreground">+1s</button>
                    <button
                      onClick={() => { if (manualVideoRef.current) setManualEnd(manualVideoRef.current.currentTime); }}
                      className="px-2 py-1 rounded border border-primary/30 text-primary text-xs hover:bg-primary/10"
                    >
                      Set to Current
                    </button>
                  </div>
                </div>
              </div>

              {/* Clip title */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Clip Title (optional)</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="My custom clip"
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Create button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowManualCreator(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border/50 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateManualClip}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-primary to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Create Clip ({Math.round(manualEnd - manualStart)}s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Reel Dialog */}
      {showSmartReel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowSmartReel(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">AI Smart Reel</h2>
              </div>
              <button onClick={() => setShowSmartReel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <p className="text-sm text-muted-foreground">
                AI will analyze your clips and create a perfectly arranged highlight reel with narrative flow.
              </p>

              {/* Reel Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Reel Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "narrative" as const, icon: "📖", label: "Narrative", desc: "Story arc with hook & climax" },
                    { value: "best_moments" as const, icon: "⭐", label: "Best Moments", desc: "Top clips by viral score" },
                    { value: "energy" as const, icon: "⚡", label: "Energy Build", desc: "Calm to explosive crescendo" },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setReelStyle(style.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                        reelStyle === style.value
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      <span className="text-xs font-medium text-foreground">{style.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Duration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Target Duration</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setTargetDuration(dur)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        targetDuration === dur
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Time estimate */}
              <p className="text-xs text-center text-muted-foreground">
                ⏱️ Rendering takes 2-5 minutes depending on reel length. You can continue using the app while it renders.
              </p>

              {/* Create Button */}
              <Button
                variant="hero"
                className="w-full"
                onClick={async () => {
                  setIsCreatingReel(true);
                  try {
                    const styleLabels = { narrative: "Narrative", best_moments: "Best Moments", energy: "Energy" };
                    const res = await apiFetch("/create-smart-reel", {
                      video_id: video.id,
                      video_storage_path: video.file_path,
                      caption_style: settings?.captionStyle || "hormozi",
                      target_duration: targetDuration,
                      style: reelStyle,
                      title: `${video.title} — ${styleLabels[reelStyle]} Reel`,
                    });
                    if (!res.ok) throw new Error("Failed");
                    toast.success("Smart Reel is being created!", {
                      description: `AI is selecting and arranging clips (${reelStyle} style, ~${targetDuration}s)`,
                    });
                    setShowSmartReel(false);
                    // Delay refetch to allow backend to insert the reel
                    setTimeout(() => fetchReels(), 2000);
                    setTimeout(() => fetchReels(), 5000);
                  } catch {
                    toast.error("Failed to create Smart Reel", {
                      description: "Please try again or contact support@hookcut.com",
                    });
                  } finally {
                    setIsCreatingReel(false);
                  }
                }}
                disabled={isCreatingReel}
              >
                {isCreatingReel ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI is building your reel...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Create Smart Reel</>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Smart Reel uses 1 render credit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clip Preview Modal */}
      <ClipPreviewModal
        clip={previewClip!}
        video={video}
        open={!!previewClip}
        onClose={() => setPreviewClip(null)}
      />

      {/* Credit confirmation dialog */}
      <RenderCreditDialog
        open={!!creditDialog}
        onClose={() => setCreditDialog(null)}
        onConfirm={handleCreditConfirm}
        creditsRequired={creditDialog?.type === "all" ? creditDialog.clips.length : 1}
        creditsRemaining={credits?.remaining ?? 0}
        loading={creditConfirmLoading}
      />

      {/* Re-analyze dialog */}
      <ReAnalyzeDialog
        open={reAnalyzeOpen}
        onClose={() => setReAnalyzeOpen(false)}
        video={video}
        existingClipCount={clips.length}
        onSuccess={() => window.location.reload()}
      />

      {/* Highlight Reels Section */}
      {(reels.length > 0 || clips.length >= 2) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Highlight Reels</h3>
            {reels.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{reels.length}</span>
            )}
          </div>
          {reels.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No highlight reels yet. Combine your best clips!</p>
              <Button variant="hero-outline" size="sm" onClick={() => navigate(`/dashboard/highlight-reel/new/${video.id}`)}>
                <Clapperboard className="w-4 h-4 mr-2" /> Create Your First Reel
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reels.map((reel) => (
                <HighlightReelCard
                  key={reel.id}
                  reel={reel}
                  onDelete={(id) => setReels((prev) => prev.filter((r) => r.id !== id))}
                  onEdit={(r) => navigate(`/dashboard/highlight-reel/edit/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Failed State ─── */
const FailedState = ({ video }: { video: Tables<"videos"> }) => {
  const navigate = useNavigate();

  const handleRetry = async () => {
    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing" } as any)
      .eq("id", video.id);
    if (error) {
      toast.error("Failed to retry");
      return;
    }
    toast.success("Retrying analysis...");
    window.location.reload();
  };

  return (
    <div className="glass-card rounded-2xl p-10 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
        <XCircle className="w-8 h-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">Analysis Failed</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Something went wrong. Analysis is free — try again!
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="hero" size="lg" onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Try Again
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Still having issues? Email us at{" "}
        <a href="mailto:support@hookcut.com" className="text-primary hover:underline">support@hookcut.com</a>
      </p>
    </div>
  );
};

/* ─── Helpers ─── */
function getDisplayTitle(video: Tables<"videos">): string {
  if (video.title && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(video.title)) {
    return video.title;
  }
  if (video.file_path) {
    const parts = video.file_path.split("/");
    const filename = parts[parts.length - 1];
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const cleaned = nameWithoutExt.replace(/^\d+_/, "");
    if (cleaned) return cleaned;
  }
  return "Untitled Video";
}

/* ─── Main Page ─── */
const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [clips, setClips] = useState<Tables<"clips">[]>([]);
  const [loading, setLoading] = useState(true);
  const [reAnalyzeOpen, setReAnalyzeOpen] = useState(false);
  const videoRef = useRef<Tables<"videos"> | null>(null);

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [videoRes, clipsRes] = await Promise.all([
        supabase.from("videos").select("*").eq("id", id).single(),
        supabase.from("clips").select("*").eq("video_id", id).order("viral_score", { ascending: false }),
      ]);
      if (videoRes.data) setVideo(videoRes.data);
      if (clipsRes.data) setClips(clipsRes.data);
      setLoading(false);
    };
    fetchData();

    // Poll every 5s
    const poll = setInterval(async () => {
      const { data } = await supabase.from("videos").select("*").eq("id", id).single();
      if (data) {
        const prevStatus = videoRef.current?.status;
        if (data.status !== prevStatus) {
          setVideo(data);
        }
        // Always refetch clips when status is ready (they may still be loading)
        if (data.status === "ready") {
          const { data: clipsData } = await supabase
            .from("clips").select("*")
            .eq("video_id", id)
            .order("viral_score", { ascending: false });
          if (clipsData && clipsData.length > 0) {
            setClips(clipsData);
          }
        }
      }
    }, 5000);

    // Realtime subscription
    const channel = supabase
      .channel(`video-detail-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "videos",
        filter: `id=eq.${id}`,
      }, async (payload: any) => {
        setVideo(payload.new);
        if (payload.new.status === "ready" || payload.new.status === "failed") {
          // Small delay to let clips finish writing to DB
          setTimeout(async () => {
            const { data: clipsData } = await supabase
              .from("clips").select("*")
              .eq("video_id", id)
              .order("viral_score", { ascending: false });
            if (clipsData) setClips(clipsData);
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [id]);

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
        <AlertCircle className="w-10 h-10" />
        <p>Video not found</p>
        <Button variant="ghost" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  const badge = statusConfig[video.status] || statusConfig.uploading;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to videos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{getDisplayTitle(video)}</h1>
          {video.status === "ready" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setReAnalyzeOpen(true)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-analyze
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
          {video.duration && (
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{video.duration}</span>
          )}
          <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />{formatBytes(video.file_size)}</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(video.created_at)}</span>
          <Badge className={`${badge.class} border text-xs`}>{badge.label}</Badge>
        </div>
      </div>

      {/* Status-based content */}
      {video.status === "downloading" && <DownloadingState video={video} />}
      {video.status === "uploading" && <UploadedState video={video} />}
      {video.status === "uploaded" && <UploadedState video={video} />}
      {video.status === "analyzing" && <AnalyzingState video={video} />}
      {video.status === "ready" && <ReadyState video={video} clips={clips} onReAnalyze={() => setReAnalyzeOpen(true)} />}
      {video.status === "failed" && <FailedState video={video} />}

      {/* Re-analyze dialog (page level for ready status) */}
      <ReAnalyzeDialog
        open={reAnalyzeOpen}
        onClose={() => setReAnalyzeOpen(false)}
        video={video}
        existingClipCount={clips.length}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default VideoDetail;

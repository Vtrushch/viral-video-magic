import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Play, Download, Star, Clock, Calendar, Settings2,
  Loader2, AlertCircle, HardDrive, RotateCcw, CheckCircle2, Sparkles,
  Search, Zap, Film, ChevronRight, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const scoreColor = (score: number) => {
  if (score >= 8) return "bg-accent/15 text-accent";
  if (score >= 6) return "bg-secondary/15 text-secondary";
  return "bg-muted text-muted-foreground";
};

const statusConfig: Record<string, { class: string; label: string }> = {
  uploading: { class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Uploaded" },
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

/* ─── Analyzing State ─── */
const AnalyzingState = ({ video }: { video: Tables<"videos"> }) => {
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const channel = supabase
      .channel(`video-${video.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "videos",
        filter: `id=eq.${video.id}`,
      }, (payload: any) => {
        if (payload.new.status === "ready" || payload.new.status === "failed") {
          window.location.reload();
        }
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

  const steps = [
    { icon: CheckCircle2, label: "Video uploaded", done: true },
    { icon: Search, label: "Analyzing content...", done: currentStep > 1 },
    { icon: Zap, label: "Finding viral moments", done: currentStep > 2 },
    { icon: Film, label: "Generating clips", done: currentStep > 3 },
  ];

  return (
    <div className="glass-card rounded-2xl p-10 text-center space-y-8">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full gradient-bg opacity-20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary">
          <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">AI is Analyzing Your Video...</h2>
        <p className="text-sm text-muted-foreground">This usually takes 2–3 minutes</p>
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
        <span className="text-accent/80">You can close this page. We'll notify you when it's ready!</span>
      </div>

      {/* Debug button - only in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 pt-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
            <span>🔧</span> Development Mode
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast.error("User not found");
                  return;
                }

                const fakeClips = [
                  { title: "Top 5 Productivity Mistakes", viral_score: 9, duration: "0:30" },
                  { title: "The Secret to Success", viral_score: 8, duration: "0:45" },
                  { title: "Game Changing Strategy", viral_score: 7, duration: "0:50" },
                ];

                const { error: clipsError } = await supabase
                  .from("clips")
                  .insert(
                    fakeClips.map((clip) => ({
                      video_id: video.id,
                      user_id: user.id,
                      ...clip,
                      status: "ready",
                      thumbnail_url: video.thumbnail_url,
                    }))
                  );

                if (clipsError) throw clipsError;

                const { error: videoError } = await supabase
                  .from("videos")
                  .update({ status: "ready" })
                  .eq("id", video.id);

                if (videoError) throw videoError;

                toast.success("Test clips created!");
                window.location.reload();
              } catch (error) {
                console.error("Debug error:", error);
                toast.error("Failed to create test clips");
              }
            }}
          >
            Skip to Ready (Create Test Clips)
          </Button>
        </div>
      )}
    </div>
  );
};

/* ─── Ready State ─── */
const ReadyState = ({ video, clips }: { video: Tables<"videos">; clips: Tables<"clips">[] }) => {
  if (clips.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">No clips generated</h2>
        <p className="text-sm text-muted-foreground">Something went wrong during processing.</p>
        <Button variant="hero">
          <RotateCcw className="w-4 h-4 mr-2" /> Retry Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video preview */}
      {video.thumbnail_url ? (
        <div className="aspect-video rounded-2xl overflow-hidden relative glass-card">
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary">
              <Play className="w-6 h-6 text-primary-foreground ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-video rounded-2xl flex items-center justify-center glass-card">
          <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </div>
      )}

      {/* Clips header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Generated Clips ({clips.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Download All
          </Button>
        </div>
      </div>

      {/* Clips grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="glass-card-hover rounded-xl p-4 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden bg-background/50">
              {clip.thumbnail_url ? (
                <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" />
              ) : (
                <Play className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{clip.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                {clip.duration && <span className="text-xs text-muted-foreground">{clip.duration}</span>}
                {clip.viral_score != null && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${scoreColor(clip.viral_score)}`}>
                    <Star className="w-3 h-3" /> {clip.viral_score}/10
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" disabled={clip.status !== "ready"}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
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
          Something went wrong during processing. Please try again.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="hero" size="lg" onClick={handleRetry}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry Analysis
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [clips, setClips] = useState<Tables<"clips">[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to videos
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{video.title}</h1>
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
      {video.status === "uploading" && <UploadedState video={video} />}
      {video.status === "analyzing" && <AnalyzingState video={video} />}
      {video.status === "ready" && <ReadyState video={video} clips={clips} />}
      {video.status === "failed" && <FailedState video={video} />}
    </div>
  );
};

export default VideoDetail;

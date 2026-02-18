import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  Download,
  Play,
  Flame,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Timer,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Sparkles,
  Film,
  Clapperboard,
} from "lucide-react";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import HighlightReelCard from "@/components/dashboard/HighlightReelCard";

type MainTab = "clips" | "reels";
type StatusFilter = "all" | "ready" | "rendering" | "pending" | "failed";
type SortBy = "viral_score" | "created_at" | "duration_seconds";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode; pulse?: boolean }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: <Timer className="w-3 h-3" />,
  },
  queued: {
    label: "Queued",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: <Timer className="w-3 h-3" />,
  },
  rendering: {
    label: "Rendering",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    pulse: true,
  },
  ready: {
    label: "Ready",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "rendering", label: "Rendering" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "viral_score", label: "Viral Score" },
  { id: "created_at", label: "Date" },
  { id: "duration_seconds", label: "Duration" },
];

const ClipsLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("clips");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("viral_score");
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: clips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ["all-clips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const videoIds = useMemo(
    () => [...new Set(clips.map((c) => c.video_id))],
    [clips]
  );

  const { data: videos = [] } = useQuery({
    queryKey: ["videos-for-clips", videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return [];
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, file_path")
        .in("id", videoIds);
      if (error) throw error;
      return data || [];
    },
    enabled: videoIds.length > 0,
  });

  const videoMap = useMemo(
    () => Object.fromEntries(videos.map((v) => [v.id, { title: v.title, file_path: v.file_path }])),
    [videos]
  );

  // Fetch all highlight reels for the user
  const { data: reels = [], refetch: refetchReels } = useQuery({
    queryKey: ["all-reels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("highlight_reels" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const filteredClips = useMemo(() => {
    let result = clips;
    if (filter !== "all") {
      if (filter === "pending") {
        result = result.filter((c) => c.status === "pending" || c.status === "queued");
      } else if (filter === "rendering") {
        result = result.filter((c) => c.status === "rendering");
      } else {
        result = result.filter((c) => c.status === filter);
      }
    }
    return [...result].sort((a, b) => {
      if (sortBy === "viral_score") return (b.viral_score ?? 0) - (a.viral_score ?? 0);
      if (sortBy === "duration_seconds") return (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [clips, filter, sortBy]);

  const readyClips = useMemo(
    () => filteredClips.filter((c) => c.status === "ready"),
    [filteredClips]
  );

  const selectAllReady = () => {
    setSelectedClips(new Set(readyClips.map((c) => c.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async (clip: Tables<"clips">) => {
    if (!clip.file_path) {
      toast.error("No file available for download");
      return;
    }
    setDownloading(clip.id);
    try {
      const response = await fetch(clip.file_path);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clip.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloading clip...");
    } catch {
      toast.error("Failed to download clip");
    } finally {
      setDownloading(null);
    }
  };

  const handleBatchDownload = async () => {
    const selected = clips.filter(
      (c) => selectedClips.has(c.id) && c.status === "ready" && c.file_path
    );
    if (selected.length === 0) {
      toast.error("No ready clips selected");
      return;
    }
    for (let i = 0; i < selected.length; i++) {
      const clip = selected[i];
      try {
        const response = await fetch(clip.file_path!);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clip.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${i + 1} of ${selected.length} clips`);
      } catch {
        toast.error(`Failed to download ${clip.title}`);
      }
      if (i < selected.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const getScoreStyle = (score: number | null) => {
    if (score === null || score === undefined) return { ring: "ring-muted-foreground/20", text: "text-muted-foreground", glow: "" };
    if (score >= 8) return { ring: "ring-accent/60", text: "text-accent", glow: "shadow-[0_0_12px_hsl(177,100%,39%,0.3)]" };
    if (score >= 6) return { ring: "ring-yellow-400/50", text: "text-yellow-400", glow: "shadow-[0_0_12px_hsl(50,100%,60%,0.2)]" };
    return { ring: "ring-muted-foreground/20", text: "text-muted-foreground", glow: "" };
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clips.length };
    for (const c of clips) {
      const key = c.status === "queued" ? "pending" : c.status;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [clips]);

  if (clipsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading clips...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-x-hidden animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Your <span className="gradient-text">Clips</span>
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{clips.length}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {videoIds.length} source video{videoIds.length !== 1 ? "s" : ""} • {readyClips.length} ready to download
          </p>
        </div>

        {selectedClips.size > 0 && mainTab === "clips" && (
          <Button variant="hero" size="sm" onClick={handleBatchDownload} className="shrink-0">
            <Download className="w-4 h-4 mr-1.5" />
            Download {selectedClips.size}
          </Button>
        )}
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm w-fit mb-6">
        <button
          onClick={() => setMainTab("clips")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "clips"
              ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <Film className="w-4 h-4" />
          Clips
          {clips.length > 0 && <span className={`text-xs ${mainTab === "clips" ? "opacity-80" : "opacity-50"}`}>{clips.length}</span>}
        </button>
        <button
          onClick={() => setMainTab("reels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "reels"
              ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          Highlight Reels
          {reels.length > 0 && <span className={`text-xs ${mainTab === "reels" ? "opacity-80" : "opacity-50"}`}>{reels.length}</span>}
        </button>
      </div>

      {/* ── CLIPS TAB ── */}
      {mainTab === "clips" && (
        <>
          {/* Filters & Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm flex-1">
              {FILTER_TABS.map((tab) => {
                const count = statusCounts[tab.id] || 0;
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`relative px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={`ml-1.5 ${isActive ? "opacity-80" : "opacity-50"}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {readyClips.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedClips.size > 0 ? () => setSelectedClips(new Set()) : selectAllReady}
                  className="text-xs h-9"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  {selectedClips.size > 0 ? "Deselect" : `Select ${readyClips.length}`}
                </Button>
              )}
              <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card/50 border border-border/50">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-transparent text-xs text-foreground outline-none cursor-pointer pr-1"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-card text-foreground">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredClips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border/50 bg-card/20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-primary/15 to-secondary/15 border border-primary/10">
                <Play className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1.5">
                {filter === "all" ? "No clips yet" : `No ${filter} clips`}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs text-center">
                {filter === "all"
                  ? "Upload a video and run AI analysis to generate clips"
                  : "Try a different filter to see your clips"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredClips.map((clip) => {
                const status = STATUS_CONFIG[clip.status] || STATUS_CONFIG.pending;
                const scoreStyle = getScoreStyle(clip.viral_score);
                const isSelected = selectedClips.has(clip.id);
                const isReady = clip.status === "ready";

                return (
                  <div
                    key={clip.id}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                      isSelected
                        ? "ring-2 ring-primary shadow-[0_0_30px_hsl(349,100%,59%,0.2)]"
                        : "ring-1 ring-border/30 hover:ring-border/60"
                    }`}
                    style={{ background: "hsl(240, 15%, 10%)" }}
                    onClick={() => navigate(`/dashboard/videos/edit/${clip.id}`)}
                  >
                    <div className="relative aspect-[9/16] overflow-hidden">
                      <ClipVideoThumbnail
                        renderedUrl={isReady && clip.file_path ? clip.file_path : null}
                        filePath={!isReady ? (videoMap[clip.video_id]?.file_path || null) : null}
                        startTime={clip.start_time}
                        fallbackImageUrl={clip.thumbnail_url || undefined}
                        alt={clip.title}
                        className="group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30 pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-2.5 left-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg ${status.color} ${status.bg} border ${status.border} backdrop-blur-md ${status.pulse ? "animate-pulse" : ""}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      {isReady && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(clip.id); }}
                          className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isSelected
                              ? "bg-primary border-2 border-primary shadow-lg shadow-primary/30"
                              : "border-2 border-white/30 bg-black/30 backdrop-blur-sm hover:border-white/60 hover:bg-black/50"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                        </button>
                      )}
                      {clip.viral_score != null && (
                        <div className={`absolute bottom-12 right-2.5 w-10 h-10 rounded-full ring-2 ${scoreStyle.ring} ${scoreStyle.glow} bg-black/50 backdrop-blur-md flex flex-col items-center justify-center`}>
                          <span className={`text-xs font-black leading-none ${scoreStyle.text}`}>{clip.viral_score}</span>
                          <span className="text-[7px] text-white/40 font-medium">/10</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="font-semibold text-[13px] text-white line-clamp-2 leading-snug mb-1.5 drop-shadow-lg">{clip.title}</h4>
                        <div className="flex items-center gap-2">
                          {clip.duration && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/70">
                              <Clock className="w-2.5 h-2.5" />{clip.duration}
                            </span>
                          )}
                          <span className="text-[10px] text-white/40 truncate">{videoMap[clip.video_id]?.title || ""}</span>
                        </div>
                      </div>
                    </div>
                    {isReady && clip.file_path && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/60 to-transparent">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                          onClick={(e) => { e.stopPropagation(); handleDownload(clip); }}
                          disabled={downloading === clip.id}
                        >
                          {downloading === clip.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── HIGHLIGHT REELS TAB ── */}
      {mainTab === "reels" && (
        <div>
          {reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border/50 bg-card/20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-primary/15 to-secondary/15 border border-primary/10">
                <Clapperboard className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1.5">No highlight reels yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs text-center">
                Open a video, select your best clips, and create a highlight reel!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reels.map((reel) => (
                <HighlightReelCard
                  key={reel.id}
                  reel={reel}
                  onDelete={() => refetchReels()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClipsLibrary;

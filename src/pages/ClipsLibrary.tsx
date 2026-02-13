import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";

type StatusFilter = "all" | "ready" | "rendering" | "pending" | "failed";
type SortBy = "viral_score" | "created_at" | "duration_seconds";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode; pulse?: boolean }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-400",
    bg: "bg-yellow-400/15",
    icon: <Timer className="w-3 h-3" />,
  },
  queued: {
    label: "Queued",
    color: "text-yellow-400",
    bg: "bg-yellow-400/15",
    icon: <Timer className="w-3 h-3" />,
  },
  rendering: {
    label: "Rendering",
    color: "text-blue-400",
    bg: "bg-blue-400/15",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    pulse: true,
  },
  ready: {
    label: "Ready",
    color: "text-accent",
    bg: "bg-accent/15",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-400/15",
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
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("viral_score");
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch all clips
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

  // Fetch videos for titles
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
        .select("id, title")
        .in("id", videoIds);
      if (error) throw error;
      return data || [];
    },
    enabled: videoIds.length > 0,
  });

  const videoMap = useMemo(
    () => Object.fromEntries(videos.map((v) => [v.id, v.title])),
    [videos]
  );

  // Filter & sort
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
      const a = document.createElement("a");
      a.href = clip.file_path; // R2 public URL set by Modal worker
      a.download = `${clip.title}.mp4`;
      a.click();
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
        const a = document.createElement("a");
        a.href = clip.file_path; // R2 public URL
        a.download = `${clip.title}.mp4`;
        a.click();
        toast.success(`Downloaded ${i + 1} of ${selected.length} clips`);
      } catch {
        toast.error(`Failed to download ${clip.title}`);
      }
      
      // Add 100ms delay between downloads to avoid browser blocking
      if (i < selected.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null || score === undefined)
      return { color: "text-muted-foreground", bg: "bg-muted/30" };
    if (score >= 8) return { color: "text-accent", bg: "bg-accent/15" };
    if (score >= 6) return { color: "text-yellow-400", bg: "bg-yellow-400/15" };
    return { color: "text-muted-foreground", bg: "bg-muted/30" };
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="p-6 lg:p-8 w-full overflow-x-hidden"
      style={{ background: "#0F0F1A", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Your <span className="gradient-text">Clips</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {clips.length} clip{clips.length !== 1 ? "s" : ""} across{" "}
          {videoIds.length} video{videoIds.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters & Sort Bar */}
      <div className="glass-card rounded-xl p-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-1">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 flex-shrink-0" />
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.id
                  ? "gradient-bg text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.label}
              {statusCounts[tab.id] !== undefined && (
                <span className="ml-1 opacity-70">({statusCounts[tab.id] || 0})</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-muted/30 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {readyClips.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={selectAllReady}>
            <CheckSquare className="w-4 h-4 mr-1" />
            Select All Ready ({readyClips.length})
          </Button>
          {selectedClips.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedClips(new Set())}>
                Deselect All
              </Button>
              <Button variant="hero" size="sm" onClick={handleBatchDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download {selectedClips.size} Clip{selectedClips.size !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredClips.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))",
            }}
          >
            <Play className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {filter === "all" ? "No clips yet" : `No ${filter} clips`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "Upload a video and run AI analysis to generate clips"
              : "Try a different filter to see your clips"}
          </p>
        </div>
      ) : (
        /* Clip Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClips.map((clip) => {
            const status = STATUS_CONFIG[clip.status] || STATUS_CONFIG.pending;
            const scoreBadge = getScoreBadge(clip.viral_score);
            const isSelected = selectedClips.has(clip.id);
            const isReady = clip.status === "ready";

            return (
              <div
                key={clip.id}
                className={`glass-card-hover rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                  isSelected
                    ? "ring-2 ring-primary/60 shadow-[0_0_24px_hsl(349,100%,59%,0.15)]"
                    : ""
                }`}
                onClick={() => navigate(`/dashboard/videos/edit/${clip.id}`)}
              >
                {/* 9:16 Thumbnail area */}
                <div className="relative aspect-[9/16] overflow-hidden bg-muted/20">
                  {clip.thumbnail_url ? (
                    <img
                      src={clip.thumbnail_url}
                      alt={clip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30">
                      <Play className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                  {/* Top badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                    {/* Status */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md ${status.color} ${status.bg} backdrop-blur-sm ${
                        status.pulse ? "animate-pulse" : ""
                      }`}
                    >
                      {status.icon}
                      {status.label}
                    </span>

                    {/* Select checkbox area */}
                    {isReady && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(clip.id);
                        }}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-white/40 bg-black/30 hover:border-white/70"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Bottom overlay info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <h4 className="font-semibold text-sm text-white line-clamp-2 mb-1.5 drop-shadow-md">
                      {clip.title}
                    </h4>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Viral score */}
                      {clip.viral_score != null && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${scoreBadge.color} ${scoreBadge.bg} backdrop-blur-sm`}
                        >
                          <Flame className="w-3 h-3" />
                          {clip.viral_score}/10
                        </span>
                      )}

                      {/* Duration */}
                      {clip.duration && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md text-white/80 bg-black/40 backdrop-blur-sm">
                          <Clock className="w-3 h-3" />
                          {clip.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
                    From: {videoMap[clip.video_id] || "Unknown video"}
                  </span>

                  {isReady && clip.file_path && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-accent hover:text-accent hover:bg-accent/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(clip);
                      }}
                      disabled={downloading === clip.id}
                    >
                      {downloading === clip.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClipsLibrary;

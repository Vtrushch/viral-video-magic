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
  Loader2,
  ArrowUpDown,
  CheckSquare,
  CheckCircle2,
  Sparkles,
  Film,
  Clapperboard,
  Pencil,
  Clock,
} from "lucide-react";
import HighlightReelCard from "@/components/dashboard/HighlightReelCard";

type MainTab = "clips" | "reels";
type SortBy = "viral_score" | "created_at" | "duration_seconds";

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "viral_score", label: "Viral Score" },
  { id: "created_at", label: "Date" },
  { id: "duration_seconds", label: "Duration" },
];

const ClipsLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("clips");
  const [sortBy, setSortBy] = useState<SortBy>("viral_score");
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: clips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ["all-clips-ready", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .eq("status", "ready")
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

  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => {
      if (sortBy === "viral_score") return (b.viral_score ?? 0) - (a.viral_score ?? 0);
      if (sortBy === "duration_seconds") return (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [clips, sortBy]);

  const selectAllReady = () => {
    setSelectedClips(new Set(clips.map((c) => c.id)));
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
      (c) => selectedClips.has(c.id) && c.file_path
    );
    if (selected.length === 0) {
      toast.error("No clips selected");
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            Your <span className="text-primary">Clips</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Your rendered clips ready to download and share
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
          {/* Sort & Select */}
          {clips.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              {clips.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedClips.size > 0 ? () => setSelectedClips(new Set()) : selectAllReady}
                  className="text-xs h-9"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  {selectedClips.size > 0 ? "Deselect" : `Select ${clips.length}`}
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
          )}

          {sortedClips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No clips yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a video and render your first clip
              </p>
              <Button onClick={() => navigate("/dashboard")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Go to Videos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedClips.map((clip) => {
                const scoreStyle = getScoreStyle(clip.viral_score);
                const isSelected = selectedClips.has(clip.id);

                return (
                  <div
                    key={clip.id}
                    className={`rounded-xl border overflow-hidden group transition-all duration-200 ${
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : "border-border/50 hover:border-border"
                    }`}
                    style={{ background: "hsl(240, 15%, 10%)" }}
                  >
                    {/* Video preview */}
                    <div className="relative aspect-[9/16] max-h-[300px] bg-black">
                      <video
                        src={clip.file_path || undefined}
                        className="w-full h-full object-contain"
                        preload="metadata"
                        playsInline
                        controls
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30">
                          Ready
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(clip.id); }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isSelected
                              ? "bg-primary border-2 border-primary"
                              : "border-2 border-white/30 bg-black/30 backdrop-blur-sm hover:border-white/60"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                        </button>
                      </div>
                      {clip.viral_score != null && (
                        <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full ring-2 ${scoreStyle.ring} ${scoreStyle.glow} bg-black/60 backdrop-blur-md flex flex-col items-center justify-center`}>
                          <span className={`text-xs font-black leading-none ${scoreStyle.text}`}>{clip.viral_score}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{clip.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {clip.duration_seconds && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {clip.duration_seconds}s
                          </span>
                        )}
                        <span className="truncate">{videoMap[clip.video_id]?.title || "Unknown video"}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleDownload(clip)}
                          disabled={downloading === clip.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {downloading === clip.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/videos/edit/${clip.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-muted-foreground text-xs font-medium hover:text-foreground hover:border-primary/30 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Re-edit
                        </button>
                      </div>
                    </div>
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

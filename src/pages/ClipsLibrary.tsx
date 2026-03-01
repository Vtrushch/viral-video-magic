import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { downloadClip, clipFilename } from "@/lib/downloadClip";
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
  Play,
  Eye,
  Trash2,
} from "lucide-react";
import HighlightReelCard from "@/components/dashboard/HighlightReelCard";
import ClipPreviewModal from "@/components/dashboard/ClipPreviewModal";
import { useTranslation } from "react-i18next";

type MainTab = "clips" | "reels";
type SortBy = "viral_score" | "created_at" | "duration_seconds";

const ClipsLibrary = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("clips");
  const [sortBy, setSortBy] = useState<SortBy>("viral_score");
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewClip, setPreviewClip] = useState<Tables<"clips"> | null>(null);
  const [confirmDeleteClipId, setConfirmDeleteClipId] = useState<string | null>(null);
  const [deletingClipId, setDeletingClipId] = useState<string | null>(null);

  const SORT_OPTIONS: { id: SortBy; label: string }[] = [
    { id: "viral_score", label: t("clips.sortViralScore") },
    { id: "created_at", label: t("clips.sortDate") },
    { id: "duration_seconds", label: t("clips.sortDuration") },
  ];

  // Queries for clips, videos, and reels
  const { data: clips = [], isLoading: clipsLoading, refetch: refetchClips } = useQuery({
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
      toast.error(t("common.noFileAvailable"));
      return;
    }
    setDownloading(clip.id);
    try {
      await downloadClip(clip.file_path, clipFilename(clip.title, clip.id));
    } catch {
      // downloadClip already shows error toast
    } finally {
      setDownloading(null);
    }
  };

  const handleBatchDownload = async () => {
    const selected = clips.filter(
      (c) => selectedClips.has(c.id) && c.file_path
    );
    if (selected.length === 0) {
      toast.error(t("common.noClipsSelected"));
      return;
    }
    for (let i = 0; i < selected.length; i++) {
      const clip = selected[i];
      try {
        await downloadClip(clip.file_path!, clipFilename(clip.title, clip.id));
      } catch {
        toast.error(t("common.failedToDownload", { title: clip.title }));
      }
      if (i < selected.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    setDeletingClipId(clipId);
    try {
      const { error } = await supabase.from("clips").delete().eq("id", clipId);
      if (error) throw error;
      toast.success(t("common.clipDeleted"));
      refetchClips();
    } catch {
      toast.error(t("common.clipDeleteFailed"));
    } finally {
      setDeletingClipId(null);
      setConfirmDeleteClipId(null);
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
          <span className="text-sm text-muted-foreground">{t("clips.loadingClips")}</span>
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
            {t("clips.yourClips").split(" ").map((word, i) =>
              i === 1 ? <span key={i} className="text-primary">{word} </span> : word + " "
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("clips.yourRenderedClips")}
          </p>
        </div>

        {selectedClips.size > 0 && mainTab === "clips" && (
          <Button variant="hero" size="sm" onClick={handleBatchDownload} className="shrink-0">
            <Download className="w-4 h-4 mr-1.5" />
            {t("common.download")} {selectedClips.size}
          </Button>
        )}
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm w-fit mb-6">
        <button
          onClick={() => setMainTab("clips")}
          className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "clips"
              ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <Film className="w-4 h-4" />
          {t("nav.clips")}
          {clips.length > 0 && <span className={`text-xs ${mainTab === "clips" ? "opacity-80" : "opacity-50"}`}>{clips.length}</span>}
        </button>
        <button
          onClick={() => setMainTab("reels")}
          className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "reels"
              ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          {t("clips.highlightReels")}
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
                  className="text-xs min-h-[44px]"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  {selectedClips.size > 0 ? t("common.deselect") : `${t("common.select")} ${clips.length}`}
                </Button>
              )}
              <div className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-card/50 border border-border/50">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-transparent text-xs text-foreground outline-none cursor-pointer pr-1 min-h-[44px]"
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
              <h3 className="text-lg font-medium text-foreground mb-1">{t("clips.noClipsYet")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("clips.uploadAndRender")}
              </p>
              <Button onClick={() => navigate("/dashboard")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {t("common.goToVideos")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedClips.map((clip) => {
                const scoreStyle = getScoreStyle(clip.viral_score);
                const isSelected = selectedClips.has(clip.id);

                return (
                  <div
                    key={clip.id}
                    className={`glass-card-hover rounded-xl p-4 space-y-3 transition-all duration-200 ${
                      isSelected ? "ring-1 ring-primary" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* 9:16 thumbnail */}
                      <div
                        className="w-16 h-28 rounded-lg flex-shrink-0 overflow-hidden relative cursor-pointer"
                        style={{ background: "linear-gradient(180deg, hsl(240,15%,14%) 0%, hsl(240,15%,10%) 100%)" }}
                        onClick={() => setPreviewClip(clip)}
                      >
                        {clip.thumbnail_url ? (
                          <img
                            src={clip.thumbnail_url}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : clip.file_path ? (
                          <video
                            src={`${clip.file_path}#t=0.5`}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-accent" />
                            <h4 className="text-sm font-semibold text-foreground truncate">{clip.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {clip.duration_seconds && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {clip.duration_seconds}s
                              </span>
                            )}
                            <span className="truncate">{videoMap[clip.video_id]?.title || t("clips.unknownVideo")}</span>
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
                            <Eye className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("common.preview")}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => navigate(`/dashboard/videos/edit/${clip.id}`)}
                          >
                            <Pencil className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("clips.reEdit")}</span>
                          </Button>
                          <button
                            className="inline-flex items-center gap-1 h-7 min-h-[44px] px-2 text-xs text-accent hover:text-accent rounded-md hover:bg-accent/10 transition-colors disabled:opacity-50"
                            onClick={() => handleDownload(clip)}
                            disabled={downloading === clip.id}
                          >
                            {downloading === clip.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3 sm:mr-0.5" />
                            )}
                            <span className="sm:hidden">{t("clips.saveVideo")}</span>
                            <span className="hidden sm:inline">{t("common.download")}</span>
                          </button>
                          {/* Delete */}
                          {confirmDeleteClipId === clip.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-destructive font-medium">{t("common.delete")}?</span>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClip(clip.id)} disabled={deletingClipId === clip.id}>
                                {deletingClipId === clip.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t("common.yes")}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground" onClick={() => setConfirmDeleteClipId(null)}>
                                {t("common.no")}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground/50 hover:text-destructive"
                              onClick={() => setConfirmDeleteClipId(clip.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                          {/* Select checkbox */}
                          <button
                            onClick={() => toggleSelect(clip.id)}
                            className={`ml-auto w-7 h-7 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? "bg-primary border-2 border-primary"
                                : "border-2 border-border/50 hover:border-primary/30"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                          </button>
                        </div>
                      </div>

                      {/* Viral score circle */}
                      {clip.viral_score != null && (
                        <div className={`w-10 h-10 rounded-full ring-2 ${scoreStyle.ring} ${scoreStyle.glow} bg-card/60 flex items-center justify-center flex-shrink-0 self-start`}>
                          <span className={`text-sm font-bold ${scoreStyle.text}`}>{clip.viral_score}</span>
                        </div>
                      )}
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
              <h3 className="text-lg font-semibold text-foreground mb-1.5">{t("clips.noHighlightReels")}</h3>
              <p className="text-sm text-muted-foreground max-w-xs text-center">
                {t("clips.noHighlightReelsDesc")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* Clip Preview Modal */}
      {previewClip && (
        <ClipPreviewModal
          clip={previewClip}
          video={videoMap[previewClip.video_id] ? { id: previewClip.video_id, file_path: videoMap[previewClip.video_id].file_path, title: videoMap[previewClip.video_id].title } as Tables<"videos"> : null}
          open={!!previewClip}
          onClose={() => setPreviewClip(null)}
        />
      )}
    </div>
  );
};

export default ClipsLibrary;

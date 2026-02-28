import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Play, Pencil, Eye, Flame } from "lucide-react";
import { apiFetch } from "@/lib/api";
import ClipPreviewModal from "@/components/dashboard/ClipPreviewModal";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import { useTranslation } from "react-i18next";

const VideoReview = () => {
  const { t } = useTranslation();
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [previewClip, setPreviewClip] = useState<Tables<"clips"> | null>(null);

  const { data: video } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", videoId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["clips", videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .eq("video_id", videoId!)
        .order("viral_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!videoId,
  });

  const toggleClip = (clipId: string) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  };

  const selectAll = () => setSelectedClips(new Set(clips.map((c) => c.id)));
  const deselectAll = () => setSelectedClips(new Set());

  const generateSelected = async () => {
    if (selectedClips.size === 0) {
      toast.error(t("videoDetail.selectAtLeastOne"));
      return;
    }
    try {
      const { error: clipsError } = await supabase
        .from("clips")
        .update({ status: "queued" } as any)
        .in("id", Array.from(selectedClips));
      if (clipsError) throw clipsError;

      const { error: videoError } = await supabase
        .from("videos")
        .update({ status: "rendering" })
        .eq("id", videoId!);
      if (videoError) throw videoError;

      if (video) {
        const captionStyle = (video.settings as any)?.captionStyle || "hormozi";

        const selectedClipData = clips.filter((c) => selectedClips.has(c.id));
        const renderPromises = selectedClipData.map((clip) =>
          apiFetch("/render", {
            clip_id: clip.id,
            video_storage_path: video.file_path,
            start_time: parseFloat(clip.start_time || "0"),
            end_time: parseFloat(clip.end_time || "0"),
            caption_style: captionStyle,
          }).then((res) => {
            if (!res.ok) console.error(`Render request failed for clip ${clip.id}: ${res.status}`);
            return res;
          }).catch((err) => {
            console.error(`Render request error for clip ${clip.id}:`, err);
          })
        );

        Promise.all(renderPromises).then(() => {
          console.log("All render requests sent to Modal");
        });
      }

      toast.success(t("videoDetail.generatingClips", { count: selectedClips.size }));
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
      navigate(`/dashboard/videos/${videoId}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("videoDetail.failedRendering"));
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 8) return "text-accent";
    if (score >= 6) return "text-secondary";
    return "text-muted-foreground";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 w-full" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("videoConfig.backToVideos")}
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("videoDetail.reviewClips")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("videoDetail.reviewDesc")}
          </p>
        </div>
      </div>

      {/* Video Info */}
      {video && (
        <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-4">
          <h3 className="font-semibold">{video.title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t("videoDetail.originalVideo")}</span>
            {video.duration && <span>⏱️ {video.duration}</span>}
            <span>💾 {formatFileSize(video.file_size)}</span>
          </div>
        </div>
      )}

      {/* Clips Section */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {t("videoDetail.aiFound")} <span className="gradient-text">{clips.length}</span> {t("videoDetail.viralMoments")}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {t("common.selectAll")}
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              {t("common.deselectAll")}
            </Button>
          </div>
        </div>

        {/* Clips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip, index) => {
            const isSelected = selectedClips.has(clip.id);
            return (
              <div
                key={clip.id}
                className={`glass-card rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? "border-primary/60 shadow-[0_0_20px_hsl(349,100%,59%,0.2)]"
                    : "hover:border-border/80"
                }`}
                onClick={() => toggleClip(clip.id)}
              >
                {/* Top row */}
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleClip(clip.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                </div>

                {/* Thumbnail with crop simulation */}
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted/30 mb-3">
                  <ClipVideoThumbnail
                    renderedUrl={clip.status === "ready" && clip.file_path ? clip.file_path : undefined}
                    filePath={video?.file_path}
                    startTime={clip.start_time}
                    fallbackImageUrl={clip.thumbnail_url}
                    faceX={(clip.viral_analysis as any)?.face_x ?? 0.5}
                    alt={clip.title}
                  />
                  {clip.duration && (
                    <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-0.5 rounded-md z-10">
                      {clip.duration}
                    </span>
                  )}
                </div>

                {/* Info */}
                <h4 className="font-medium text-sm mb-2 line-clamp-2">{clip.title}</h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className={`font-semibold ${getScoreColor(clip.viral_score)}`}>
                    {t("clips.viralScore")}: {clip.viral_score}/10
                    {(clip.viral_score ?? 0) >= 8 && (
                      <Flame className="inline w-3 h-3 ml-1" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/videos/edit/${clip.id}`); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPreviewClip(clip); }}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-4 glass-card rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm space-y-1">
          <p className="font-medium">
            <span className="gradient-text">{selectedClips.size}</span> {t("videoDetail.ofClipsSelected", { total: clips.length })}
          </p>
          <p className="text-muted-foreground">
            {t("videoDetail.totalCredits", { count: selectedClips.size })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="hero"
            disabled={selectedClips.size === 0}
            onClick={generateSelected}
          >
            {selectedClips.size !== 1
              ? t("videoDetail.generateClipsPlural", { count: selectedClips.size })
              : t("videoDetail.generateClips", { count: selectedClips.size })} →
          </Button>
        </div>
      </div>

      {/* Clip Preview Modal */}
      {video && (
        <ClipPreviewModal
          clip={previewClip!}
          video={video}
          open={!!previewClip}
          onClose={() => setPreviewClip(null)}
        />
      )}
    </div>
  );
};

export default VideoReview;
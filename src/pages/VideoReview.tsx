import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Play, Pencil, Eye, Flame } from "lucide-react";

const VideoReview = () => {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());

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
      toast.error("Please select at least one clip");
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

      toast.success(`Generating ${selectedClips.size} clips!`);
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
      navigate(`/dashboard/videos/${videoId}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to start rendering");
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
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Videos
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Review <span className="gradient-text">AI-Generated</span> Clips
          </h1>
          <p className="text-muted-foreground mt-1">
            Select which clips you want to render. You'll only be charged for selected clips.
          </p>
        </div>
      </div>

      {/* Video Info */}
      {video && (
        <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-4">
          <h3 className="font-semibold">{video.title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>📹 Original Video</span>
            {video.duration && <span>⏱️ {video.duration}</span>}
            <span>💾 {formatFileSize(video.file_size)}</span>
          </div>
        </div>
      )}

      {/* Clips Section */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold">
            AI Found <span className="gradient-text">{clips.length}</span> Viral Moments
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
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

                {/* Thumbnail */}
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted/30 mb-3">
                  {clip.thumbnail_url ? (
                    <img
                      src={clip.thumbnail_url}
                      alt={clip.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {clip.duration && (
                    <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-0.5 rounded-md">
                      {clip.duration}
                    </span>
                  )}
                </div>

                {/* Info */}
                <h4 className="font-medium text-sm mb-2 line-clamp-2">{clip.title}</h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className={`font-semibold ${getScoreColor(clip.viral_score)}`}>
                    Viral: {clip.viral_score}/10
                    {(clip.viral_score ?? 0) >= 8 && (
                      <Flame className="inline w-3 h-3 ml-1" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
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
            <span className="gradient-text">{selectedClips.size}</span> of {clips.length} clips selected
          </p>
          <p className="text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{selectedClips.size} credits</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button
            variant="hero"
            disabled={selectedClips.size === 0}
            onClick={generateSelected}
          >
            Generate {selectedClips.size} Clip{selectedClips.size !== 1 ? "s" : ""} →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoReview;

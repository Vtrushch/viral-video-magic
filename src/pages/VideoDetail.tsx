import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Play, Download, Star, Clock, Calendar, Settings2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const scoreColors: Record<number, string> = {
  10: "bg-accent/10 text-accent",
  9: "bg-accent/10 text-accent",
  8: "bg-accent/10 text-accent",
  7: "bg-secondary/10 text-secondary",
  6: "bg-muted text-muted-foreground",
};

const statusBadge: Record<string, { class: string; label: string }> = {
  uploading: { class: "bg-yellow-500/10 text-yellow-500", label: "Uploaded" },
  analyzing: { class: "bg-secondary/10 text-secondary", label: "Analyzing" },
  ready: { class: "bg-accent/10 text-accent", label: "Ready" },
};

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
      <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.5)" }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "rgba(255,255,255,0.5)" }}>
        <AlertCircle className="w-10 h-10" />
        <p>Video not found</p>
        <Button variant="ghost" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  const badge = statusBadge[video.status] || statusBadge.uploading;

  return (
    <div className="p-6 lg:p-8 max-w-6xl" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm hover:text-foreground mb-4 transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to videos
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>{video.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          {video.duration && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{video.duration}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(video.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Badge className={`${badge.class} border-0`}>{badge.label}</Badge>
        </div>
      </div>

      {/* Status-based content */}
      {video.status === "uploading" && (
        <div className="rounded-xl p-12 text-center mb-10" style={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Settings2 className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.4)" }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: "#fff" }}>Configure your video settings</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>Set up clip preferences before starting analysis</p>
          <Button variant="hero" asChild>
            <Link to={`/dashboard/videos/configure/${video.id}`}>Configure & Analyze</Link>
          </Button>
        </div>
      )}

      {video.status === "analyzing" && (
        <div className="rounded-xl p-12 text-center mb-10" style={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: "hsl(349, 100%, 59%)" }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: "#fff" }}>AI is analyzing your video...</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>This may take a few minutes. You'll be notified when clips are ready.</p>
        </div>
      )}

      {video.status === "ready" && (
        <>
          {/* Video Player Placeholder */}
          {video.thumbnail_url ? (
            <div className="aspect-video rounded-xl overflow-hidden mb-10 relative" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary">
                  <Play className="w-6 h-6 text-primary-foreground ml-1" />
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-xl mb-10 flex items-center justify-center" style={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary">
                <Play className="w-6 h-6 text-primary-foreground ml-1" />
              </div>
            </div>
          )}

          {/* Clips */}
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "#fff" }}>Generated Clips</h2>
            {clips.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.08)" }}>
                <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>No clips generated yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{ background: "#252535", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {/* Thumbnail */}
                    <div className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#1A1A2E" }}>
                      {clip.thumbnail_url ? (
                        <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate" style={{ color: "#fff" }}>{clip.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {clip.duration && <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{clip.duration}</span>}
                        {clip.viral_score != null && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${scoreColors[clip.viral_score] || "bg-muted text-muted-foreground"}`}>
                            <Star className="w-3 h-3" />
                            {clip.viral_score}/10
                          </span>
                        )}
                        <span className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.5)" }}>{clip.status}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={clip.status !== "ready"}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoDetail;

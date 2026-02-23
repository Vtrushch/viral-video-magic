import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, Play, Pause, Flame, Clock, Star, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import LiveSubtitles from "@/components/LiveSubtitles";
import type { CaptionStyle } from "@/components/LiveSubtitles";

interface ClipPreviewModalProps {
  clip: Tables<"clips"> | null;
  video: Tables<"videos"> | null;
  open: boolean;
  onClose: () => void;
}

const ClipPreviewModal = ({ clip, video, open, onClose }: ClipPreviewModalProps) => {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const isMobileRef = useRef(false);

  // Helper to get the active video element
  const getVideoEl = useCallback(() => {
    // Check which one is visible
    if (mobileVideoRef.current && mobileVideoRef.current.offsetParent !== null) {
      isMobileRef.current = true;
      return mobileVideoRef.current;
    }
    if (desktopVideoRef.current && desktopVideoRef.current.offsetParent !== null) {
      isMobileRef.current = false;
      return desktopVideoRef.current;
    }
    // Fallback: try mobile first (for initial load before paint)
    return mobileVideoRef.current || desktopVideoRef.current;
  }, []);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startTime = parseFloat(clip?.start_time || "0");
  const endTime = parseFloat(clip?.end_time || "0");
  const clipDuration = endTime - startTime;

  // Build word list from transcription_words
  const words = useMemo(() => {
    if (!clip?.transcription_words) return [];
    const raw = clip.transcription_words as unknown[];
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw as { word: string; start: number; end: number }[];
  }, [clip?.transcription_words]);

  // relativeTime: subtract clip start so subtitle timestamps (0-based) align correctly
  const relativeTime = currentTime - startTime;

  // Get signed URL on open
  useEffect(() => {
    if (!open || !video?.file_path) return;
    setLoading(true);
    setError(null);
    setSignedUrl(null);

    supabase.storage
      .from("raw-videos")
      .createSignedUrl(video.file_path, 3600)
      .then(({ data, error: err }) => {
        if (err || !data?.signedUrl) {
          setError("Failed to load video");
          setLoading(false);
          return;
        }
        setSignedUrl(data.signedUrl);
      });

    return () => {
      setPlaying(false);
      setSignedUrl(null);
    };
  }, [open, video.file_path]);

  // Seek to start when video loads — pause first, seek, wait for seeked
  const handleLoadedMetadata = useCallback(() => {
    const el = getVideoEl();
    if (!el) return;
    el.pause();
    el.currentTime = startTime;
    setLoading(false);
  }, [startTime, getVideoEl]);

  // Auto-pause at end_time
  const handleTimeUpdate = useCallback(() => {
    const el = getVideoEl();
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.currentTime >= endTime) {
      el.pause();
      el.currentTime = startTime;
      setPlaying(false);
    }
  }, [endTime, startTime, getVideoEl]);

  const handleReload = () => {
    const el = getVideoEl();
    if (!el) return;
    setPlaying(false);
    el.pause();
    el.load();
  };

  const togglePlay = () => {
    const el = getVideoEl();
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      if (el.currentTime < startTime || el.currentTime >= endTime) {
        el.pause();
        el.currentTime = startTime;
        const onSeeked = () => {
          el.removeEventListener("seeked", onSeeked);
          el.play().catch(() => {});
          setPlaying(true);
        };
        el.addEventListener("seeked", onSeeked);
      } else {
        el.play().catch(() => {});
        setPlaying(true);
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = getVideoEl();
    if (!el) return;
    const val = parseFloat(e.target.value);
    el.pause();
    el.currentTime = val;
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      setCurrentTime(val);
    };
    el.addEventListener("seeked", onSeeked);
    setCurrentTime(val);
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, playing]);

  if (!open || !clip || !video) return null;

  const progress = clipDuration > 0 ? ((currentTime - startTime) / clipDuration) * 100 : 0;
  const viralAnalysis = clip.viral_analysis as { reason?: string; hook_strength?: number; face_x?: number } | null;

  // --- 9:16 crop simulation from 16:9 source ---
  const isRendered = clip.status === "ready" && !!clip.file_path;
  const faceX = viralAnalysis?.face_x ?? 0.5;
  const videoWidthPercent = (16 / 9) / (9 / 16) * 100; // ~316%
  const maxShift = videoWidthPercent - 100; // ~216%
  const clampedLeft = Math.max(-maxShift, Math.min(0, -(faceX * maxShift)));

  const cropVideoStyle: React.CSSProperties = isRendered
    ? {}
    : { width: `${videoWidthPercent}%`, left: `${clampedLeft}%` };
  const cropVideoClass = isRendered
    ? "w-full h-full object-contain"
    : "absolute h-full object-cover";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md animate-fade-in" />

      {/* Modal content */}
      <div
        className="relative z-10 flex flex-col lg:flex-row gap-6 max-w-4xl w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-12 right-0 lg:right-auto lg:-right-12 lg:top-0 text-muted-foreground hover:text-foreground z-20"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Video player area */}
        <div className="mx-auto lg:mx-0 flex-shrink-0">
          {/* Mobile: clean video, no phone frame */}
          <div className="block md:hidden w-full max-w-[360px] mx-auto">
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 text-destructive gap-2">
                  <X className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              {signedUrl && (
                <video
                  ref={mobileVideoRef}
                  src={signedUrl}
                  className={cropVideoClass}
                  style={cropVideoStyle}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setPlaying(false)}
                  muted={muted}
                  playsInline
                  preload="auto"
                />
              )}
              <button
                onClick={handleReload}
                className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Reload video"
              >
                <RefreshCw className="w-3 h-3 text-white/70" />
              </button>
              {words.length > 0 && (
                <LiveSubtitles
                  words={words}
                  relativeTime={relativeTime}
                  captionStyle={(clip.caption_style as CaptionStyle) ?? "hormozi"}
                />
              )}
              {!playing && !loading && !error && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity"
                  onClick={togglePlay}
                >
                  <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <input
                  type="range"
                  min={startTime}
                  max={endTime}
                  step={0.1}
                  value={Math.max(startTime, Math.min(currentTime, endTime))}
                  onChange={handleScrub}
                  className="w-full h-1 appearance-none rounded-full cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, hsl(349,100%,59%) ${Math.max(0, progress)}%, hsl(0,0%,30%) ${Math.max(0, progress)}%)`,
                  }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </button>
                    <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <span className="text-xs text-white/80 font-mono">
                    {formatTime(Math.max(0, currentTime - startTime))} / {formatTime(clipDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: phone mockup */}
          <div
            className="hidden md:block relative rounded-[2.5rem] p-3 w-[280px] lg:w-[300px]"
            style={{
              background: "linear-gradient(145deg, hsl(240,15%,16%), hsl(240,15%,10%))",
              boxShadow: "0 25px 60px -10px rgba(0,0,0,0.6), 0 0 40px -10px hsl(349,100%,59%,0.15), inset 0 1px 0 hsl(0,0%,100%,0.08)",
            }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10"
              style={{ background: "hsl(240,15%,8%)" }}
            />
            <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-black">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 text-destructive gap-2">
                  <X className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {signedUrl && (
                <video
                  ref={desktopVideoRef}
                  src={signedUrl}
                  className={cropVideoClass}
                  style={cropVideoStyle}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setPlaying(false)}
                  muted={muted}
                  playsInline
                  preload="auto"
                />
              )}
              {/* Reload button to fix frozen video */}
              <button
                onClick={handleReload}
                className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Reload video"
              >
                <RefreshCw className="w-3 h-3 text-white/70" />
              </button>

              {/* Live subtitles */}
              {words.length > 0 && (
                <LiveSubtitles
                  words={words}
                  relativeTime={relativeTime}
                  captionStyle={(clip.caption_style as CaptionStyle) ?? "hormozi"}
                />
              )}

              {/* Play overlay when paused */}
              {!playing && !loading && !error && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity"
                  onClick={togglePlay}
                >
                  <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              )}

              {/* Bottom controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                {/* Scrubber */}
                <input
                  type="range"
                  min={startTime}
                  max={endTime}
                  step={0.1}
                  value={Math.max(startTime, Math.min(currentTime, endTime))}
                  onChange={handleScrub}
                  className="w-full h-1 appearance-none rounded-full cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, hsl(349,100%,59%) ${Math.max(0, progress)}%, hsl(0,0%,30%) ${Math.max(0, progress)}%)`,
                  }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      {playing ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setMuted(!muted)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      {muted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <span className="text-xs text-white/80 font-mono">
                    {formatTime(Math.max(0, currentTime - startTime))} / {formatTime(clipDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clip info panel */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white">{clip.title}</h2>

            <div className="flex flex-wrap gap-3">
              {clip.viral_score != null && (
                <div className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg ${
                  clip.viral_score >= 8 ? "bg-accent/15 text-accent" : clip.viral_score >= 6 ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
                }`}>
                  <Star className="w-4 h-4" />
                  Viral Score: {clip.viral_score}/10
                  {clip.viral_score >= 8 && <Flame className="w-4 h-4" />}
                </div>
              )}
              {clip.duration_seconds != null && (
                <div className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {clip.duration_seconds}s
                </div>
              )}
            </div>

            {/* Time range */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="text-foreground/60">Start:</span>{" "}
                <span className="font-mono">{formatTime(startTime)}</span>
                <span className="mx-2 text-border">→</span>
                <span className="text-foreground/60">End:</span>{" "}
                <span className="font-mono">{formatTime(endTime)}</span>
              </p>
            </div>
          </div>

          {/* AI Analysis */}
          {viralAnalysis?.reason && (
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Analysis</h3>
              <p className="text-sm text-foreground/90 leading-relaxed">{viralAnalysis.reason}</p>
              {viralAnalysis.hook_strength != null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Hook Strength:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-sm transition-colors"
                        style={{
                          background: i < (viralAnalysis.hook_strength || 0)
                            ? `hsl(${349 - i * 8}, 100%, 59%)`
                            : "hsl(240,15%,18%)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-foreground/70">{viralAnalysis.hook_strength}/10</span>
                </div>
              )}
            </div>
          )}

          {/* Keyboard hints */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
            <span className="px-2 py-1 rounded-md bg-muted/40 font-mono text-muted-foreground">Space</span>
            <span>Play/Pause</span>
            <span className="text-border/40">·</span>
            <span className="px-2 py-1 rounded-md bg-muted/40 font-mono text-muted-foreground">Esc</span>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClipPreviewModal;

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

interface ClipVideoThumbnailProps {
  /** Public URL of the rendered clip (for "ready" clips) */
  renderedUrl?: string | null;
  /** Storage path in raw-videos bucket (for pending/preview clips) */
  filePath?: string | null;
  startTime?: string | null;
  /** Per-clip poster image (clips.thumbnail_url) — shown instantly for rendered clips */
  posterUrl?: string | null;
  /** Fallback image (e.g. parent video thumbnail_url) */
  fallbackImageUrl?: string | null;
  /** face_x (0-1) for 9:16 crop simulation from 16:9 source */
  faceX?: number | null;
  /** Reframe mode: smart (use faceX), center, full (letterbox) */
  reframeMode?: "smart" | "center" | "full";
  alt: string;
  className?: string;
}

const ClipVideoThumbnail = ({
  renderedUrl,
  filePath,
  startTime,
  posterUrl,
  fallbackImageUrl,
  faceX,
  reframeMode = "smart",
  alt,
  className = "",
}: ClipVideoThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seeked, setSeeked] = useState(false);
  // Only mount/fetch the (expensive) raw-preview <video> once the card scrolls into
  // view. Without this, a grid of 10-15 pending clips mounts 10-15 seeking videos at
  // once (capped at ~6 conns/host) = a spinner wall. Defaults to true if the browser
  // lacks IntersectionObserver so nothing silently stays blank.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // If we have a direct public URL (rendered clip), use it immediately
    if (renderedUrl) {
      setSignedUrl(renderedUrl);
      return;
    }

    if (!filePath) {
      setLoading(false);
      setFailed(true);
      return;
    }

    // Wait until the card is near the viewport before fetching a signed URL
    // and mounting the <video> (lazy — avoids the pending-grid spinner wall).
    if (!inView) return;

    let cancelled = false;

    const getUrl = async () => {
      const { data, error } = await supabase.storage
        .from("raw-videos")
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl || cancelled) {
        if (!cancelled) { setFailed(true); setLoading(false); }
        return;
      }

      if (!cancelled) setSignedUrl(data.signedUrl);
    };

    getUrl();
    return () => { cancelled = true; };
  }, [renderedUrl, filePath, inView]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    // For rendered clips seek to 1s, for raw clips seek to start_time
    const seekTo = renderedUrl ? 1 : (parseFloat(startTime || "0") || 0);
    video.currentTime = Math.min(seekTo, Math.max(0, video.duration - 0.1));
  };

  const handleSeeked = () => {
    setSeeked(true);
    setLoading(false);
  };

  const handleError = () => {
    // If the video src fails, try falling back to image
    setFailed(true);
    setLoading(false);
  };

  // Rendered clips: show a lightweight poster <img> instead of mounting a live
  // <video> that must download metadata and seek to a frame. A grid of 10-15
  // seeking videos (capped at ~6 connections/host) is the slow "spinner wall";
  // actual playback happens in the preview modal when the card is clicked.
  const posterForRendered = renderedUrl ? (posterUrl || fallbackImageUrl) : null;
  if (posterForRendered) {
    return (
      <img
        src={posterForRendered}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  // If video fully failed but we have a fallback image, show it
  if (failed || (!signedUrl && !loading && inView)) {
    if (fallbackImageUrl) {
      return (
        <img
          src={fallbackImageUrl}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
        />
      );
    }
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 ${className}`}>
        <Play className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  // Crop simulation based on reframe mode
  const isRawVideo = !renderedUrl;
  let videoClass: string;
  let cropStyle: React.CSSProperties = {};

  if (isRawVideo && reframeMode === "full") {
    // Full frame: letterbox
    videoClass = `w-full h-full object-contain transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`;
  } else if (isRawVideo) {
    // Smart or Center: crop with object-cover + objectPosition
    const posX = reframeMode === "smart" ? (faceX ?? 0.5) : 0.5;
    videoClass = `w-full h-full object-cover transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`;
    cropStyle = { objectPosition: `${posX * 100}% center` };
  } else {
    // Rendered clip
    videoClass = `w-full h-full object-cover transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`;
  }

  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${className}`}>
      {/* Parent-thumbnail placeholder shows instantly until the clip frame is ready */}
      {!seeked && fallbackImageUrl && (
        <img
          src={fallbackImageUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {inView && signedUrl && (
        <video
          ref={videoRef}
          src={signedUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onError={handleError}
          className={videoClass}
          style={cropStyle}
        />
      )}
      {loading && inView && signedUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ClipVideoThumbnail;

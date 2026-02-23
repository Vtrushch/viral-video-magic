import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

interface ClipVideoThumbnailProps {
  /** Public URL of the rendered clip (for "ready" clips) */
  renderedUrl?: string | null;
  /** Storage path in raw-videos bucket (for pending/preview clips) */
  filePath?: string | null;
  startTime?: string | null;
  /** Fallback image (e.g. parent video thumbnail_url) */
  fallbackImageUrl?: string | null;
  /** face_x (0-1) for 9:16 crop simulation from 16:9 source */
  faceX?: number | null;
  alt: string;
  className?: string;
}

const ClipVideoThumbnail = ({
  renderedUrl,
  filePath,
  startTime,
  fallbackImageUrl,
  faceX,
  alt,
  className = "",
}: ClipVideoThumbnailProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seeked, setSeeked] = useState(false);

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
  }, [renderedUrl, filePath]);

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

  // If video fully failed but we have a fallback image, show it
  if (failed || (!signedUrl && !loading)) {
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

  // Crop simulation: if not a rendered clip and faceX is provided, simulate 9:16 crop
  const isRawVideo = !renderedUrl && faceX != null;
  const videoWidthPercent = (16 / 9) / (9 / 16) * 100; // ~316%
  const maxShift = videoWidthPercent - 100; // ~216%
  const clampedLeft = Math.max(-maxShift, Math.min(0, -((faceX ?? 0.5) * maxShift)));

  const cropStyle: React.CSSProperties = isRawVideo
    ? { width: `${videoWidthPercent}%`, left: `${clampedLeft}%` }
    : {};
  const videoClass = isRawVideo
    ? `absolute h-full object-cover transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`
    : `w-full h-full object-cover transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`;

  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {signedUrl && (
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
      {/* Show fallback image while video is loading/seeking */}
      {!seeked && fallbackImageUrl && !loading && (
        <img
          src={fallbackImageUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default ClipVideoThumbnail;

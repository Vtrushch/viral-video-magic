import type { CSSProperties } from "react";
import { Play } from "lucide-react";

interface ClipVideoThumbnailProps {
  /** Public URL of the rendered clip (for "ready" clips) */
  renderedUrl?: string | null;
  /** Storage path in raw-videos bucket — no longer streamed (kept for API compat) */
  filePath?: string | null;
  startTime?: string | null;
  /** Per-clip poster image (clips.thumbnail_url) — generated on R2 at analysis/render */
  posterUrl?: string | null;
  /** Fallback image (e.g. parent video thumbnail_url) */
  fallbackImageUrl?: string | null;
  /** face_x (0-1) for 9:16 crop hint from a 16:9 source poster */
  faceX?: number | null;
  /** Reframe mode: smart (use faceX), center, full (letterbox) */
  reframeMode?: "smart" | "center" | "full";
  alt: string;
  className?: string;
}

/**
 * Clip thumbnail — ALWAYS an <img>, it never streams the raw source video.
 *
 * Previously, pending (unrendered) clips mounted a <video> on the raw-videos source
 * and seeked to the clip's start frame. Across a grid of clips × every dashboard view
 * that was the dominant Supabase **cached-egress** drain (and the "spinner wall").
 * Posters now live on R2 (zero egress), uploaded at analysis time for pending clips
 * and at render time for ready clips. We just show the best image available:
 * per-clip poster → parent video thumbnail → a Play placeholder.
 */
const ClipVideoThumbnail = ({
  renderedUrl,
  posterUrl,
  fallbackImageUrl,
  faceX,
  reframeMode = "full",
  alt,
  className = "",
}: ClipVideoThumbnailProps) => {
  const image = posterUrl || fallbackImageUrl || null;

  if (!image) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 ${className}`}
      >
        <Play className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  // A source-frame poster (unrendered clip) is 16:9 — hint the 9:16 crop with
  // objectPosition so the grid still reads like the final vertical clip. Rendered
  // posters are already 9:16, so they just cover.
  const isRawPoster = !renderedUrl;
  let objectClass = "object-cover";
  let cropStyle: CSSProperties = {};
  if (isRawPoster && reframeMode === "full") {
    objectClass = "object-contain";
  } else if (isRawPoster) {
    const posX = reframeMode === "smart" ? (faceX ?? 0.5) : 0.5;
    cropStyle = { objectPosition: `${posX * 100}% center` };
  }

  return (
    <img
      src={image}
      alt={alt}
      loading="lazy"
      className={`w-full h-full ${objectClass} ${className}`}
      style={cropStyle}
    />
  );
};

export default ClipVideoThumbnail;

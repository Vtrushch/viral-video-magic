import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

interface ClipVideoThumbnailProps {
  filePath: string | null;
  startTime?: string | null;
  alt: string;
  className?: string;
}

const ClipVideoThumbnail = ({ filePath, startTime, alt, className = "" }: ClipVideoThumbnailProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setLoading(false);
      setFailed(true);
      return;
    }

    let cancelled = false;

    const generateThumbnail = async () => {
      const { data, error } = await supabase.storage
        .from("raw-videos")
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl || cancelled) {
        if (!cancelled) { setFailed(true); setLoading(false); }
        return;
      }

      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        if (cancelled) return;
        const seekTo = parseFloat(startTime || "0") || 0;
        video.currentTime = Math.min(seekTo, video.duration - 0.1);
      };

      video.onseeked = () => {
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const url = canvas.toDataURL("image/jpeg", 0.7);
          setThumbnailUrl(url);
        }
        setLoading(false);
        video.src = "";
        video.load();
      };

      video.onerror = () => {
        if (!cancelled) { setFailed(true); setLoading(false); }
      };

      video.src = data.signedUrl;
    };

    generateThumbnail();
    return () => { cancelled = true; };
  }, [filePath, startTime]);

  if (failed || (!loading && !thumbnailUrl)) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 ${className}`}>
        <Play className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-muted/20 ${className}`}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl!}
      alt={alt}
      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
    />
  );
};

export default ClipVideoThumbnail;

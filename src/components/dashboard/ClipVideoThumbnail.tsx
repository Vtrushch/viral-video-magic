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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seeked, setSeeked] = useState(false);

  useEffect(() => {
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
  }, [filePath]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const seekTo = parseFloat(startTime || "0") || 0;
    video.currentTime = Math.min(seekTo, video.duration - 0.1);
  };

  const handleSeeked = () => {
    setSeeked(true);
    setLoading(false);
  };

  const handleError = () => {
    setFailed(true);
    setLoading(false);
  };

  if (failed || (!signedUrl && !loading)) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 ${className}`}>
        <Play className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
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
          className={`w-full h-full object-cover transition-opacity duration-300 ${seeked ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
};

export default ClipVideoThumbnail;

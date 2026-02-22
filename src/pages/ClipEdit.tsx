import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { apiFetch } from "@/lib/api";
import { useCredits } from "@/hooks/useCredits";
import RenderCreditDialog from "@/components/dashboard/RenderCreditDialog";
import LiveSubtitles from "@/components/LiveSubtitles";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Save,
  Zap,
  GripVertical,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Type,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CaptionStyle = "hormozi" | "mrbeast" | "minimal" | "neon" | "fire" | "elegant" | "custom";

const CAPTION_STYLES: { id: CaptionStyle; label: string; preview: string; color: string }[] = [
  { id: "hormozi", label: "Hormozi", preview: "Bold yellow, word highlight", color: "#FFD600" },
  { id: "mrbeast", label: "MrBeast", preview: "White + red pop, large", color: "#FF3333" },
  { id: "minimal", label: "Minimal", preview: "Clean white, lower-third", color: "#FFFFFF" },
  { id: "neon", label: "Neon", preview: "Electric green glow", color: "#00FF00" },
  { id: "fire", label: "Fire", preview: "Orange-red gradient feel", color: "#FF4500" },
  { id: "elegant", label: "Elegant", preview: "Soft white, thin outline", color: "#F0F0F0" },
];



const ClipEdit = () => {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [originalClipStart, setOriginalClipStart] = useState(0);
  const [originalClipEnd, setOriginalClipEnd] = useState(0);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("hormozi");
  const [transcript, setTranscript] = useState<
    { word: string; start: number; end: number; deleted: boolean; edited: boolean }[]
  >([]);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);
  const [customColor, setCustomColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [retranscribing, setRetranscribing] = useState(false);
  const retranscribeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  // Subtitle controls
  const [subtitleSize, setSubtitleSize] = useState<"small" | "medium" | "large">("medium");
  const [subtitleY, setSubtitleY] = useState(0.85);
  const { credits, refetch: refetchCredits } = useCredits();

  const { t } = useTranslation();


  const styleColors: Record<string, { color: string; bg: string; fontWeight: string }> = {
    hormozi: { color: "#FFD600", bg: "rgba(0,0,0,0.7)", fontWeight: "900" },
    mrbeast: { color: "#FF3333", bg: "rgba(0,0,0,0.8)", fontWeight: "900" },
    minimal: { color: "#FFFFFF", bg: "rgba(0,0,0,0.5)", fontWeight: "400" },
    neon: { color: "#00FF00", bg: "rgba(0,0,0,0.6)", fontWeight: "700" },
    fire: { color: "#FF4500", bg: "rgba(0,0,0,0.7)", fontWeight: "800" },
    elegant: { color: "#F0F0F0", bg: "rgba(0,0,0,0.4)", fontWeight: "300" },
    custom: { color: "#FFD600", bg: "rgba(0,0,0,0.7)", fontWeight: "900" },
  };

  const sizeMap = { small: "text-xs", medium: "text-sm", large: "text-base" };
  const currentStyleColors = styleColors[captionStyle] || styleColors.hormozi;


  const [aiTitles, setAiTitles] = useState<{text: string; style: string}[]>([]);
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [aiPlatform, setAiPlatform] = useState<"tiktok" | "youtube" | "instagram">("tiktok");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  const draggingRef = useRef<"start" | "end" | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch clip — poll every 3s if no transcription_words yet
  const { data: clip } = useQuery({
    queryKey: ["clip", clipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .eq("id", clipId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clipId,
    refetchInterval: (query) => {
      // Stop polling once we have transcription_words or plain transcription
      const d = query.state.data;
      const hasWords = d?.transcription_words && Array.isArray(d.transcription_words) && (d.transcription_words as unknown[]).length > 0;
      const hasText = !!(d?.transcription && d.transcription.trim().length > 0);
      if (hasWords || hasText) return false;
      return 3000;
    },
  });

  // Interactive subtitle preview text
  const previewText = useMemo(() => {
    const text = clip?.transcription || "";
    const words = text.split(" ").slice(0, 5).join(" ");
    return words || "Sample subtitle text";
  }, [clip?.transcription]);

  const { data: video } = useQuery({
    queryKey: ["video-for-clip", clip?.video_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", clip!.video_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clip?.video_id,
  });

// Init clip boundaries, transcription words, and crop default from face_x
  useEffect(() => {
    if (!clip) return;
    const s = parseFloat(clip.start_time || "0");
    const e = parseFloat(clip.end_time || "0");
    setClipStart(s);
    setClipEnd(e);
    setOriginalClipStart(s);
    setOriginalClipEnd(e);

    // Priority order for real transcription data:
    // 1. clip.transcription_words (DB column — Whisper words with timing, in original language)
    // 2. clip.transcription (plain text string, split evenly)
    // 3. Empty → show "generating" state with polling
    const dbWords = clip.transcription_words as
      | { word: string; start: number; end: number }[]
      | null;

    if (dbWords && Array.isArray(dbWords) && dbWords.length > 0) {
      setTranscript(dbWords.map((w) => ({ ...w, deleted: false, edited: false })));
      setTranscriptLoading(false);
    } else if (clip.transcription && clip.transcription.trim().length > 0) {
      const words = clip.transcription.trim().split(/\s+/);
      const duration = e - s;
      const wordDuration = words.length > 0 ? duration / words.length : 0;
      setTranscript(
        words.map((word, i) => ({
          word,
          start: i * wordDuration,
          end: (i + 1) * wordDuration,
          deleted: false,
          edited: false,
        }))
      );
      setTranscriptLoading(false);
    } else {
      setTranscript([]);
      setTranscriptLoading(true);
    }

    const settings = video?.settings as Record<string, unknown> | null;
    if (settings?.captionStyle) {
      setCaptionStyle(settings.captionStyle as CaptionStyle);
    }
  }, [clip, video]);

  // Get signed URL
  useEffect(() => {
    if (!video?.file_path) return;
    setLoading(true);
    supabase.storage
      .from("raw-videos")
      .createSignedUrl(video.file_path, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          toast.error("Failed to load video");
          setLoading(false);
          return;
        }
        setSignedUrl(data.signedUrl);
      });
  }, [video?.file_path]);

  // Helper: get the active video element (desktop or mobile)
  const getActiveVideoEl = () => videoRef.current || mobileVideoRef.current;

  const handleLoadedMetadata = useCallback(() => {
    const el = getActiveVideoEl();
    if (!el) return;
    el.pause();
    el.currentTime = clipStart;
    setLoading(false);
  }, [clipStart]);

  const handleTimeUpdate = useCallback(() => {
    const el = getActiveVideoEl();
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.currentTime >= clipEnd) {
      el.pause();
      el.currentTime = clipStart;
      setPlaying(false);
    }
  }, [clipEnd, clipStart]);

  const handleReload = () => {
    const el = getActiveVideoEl();
    if (!el) return;
    setPlaying(false);
    el.pause();
    el.load();
  };

  const togglePlay = () => {
    const el = getActiveVideoEl();
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      if (el.currentTime < clipStart || el.currentTime >= clipEnd) {
        el.pause();
        el.currentTime = clipStart;
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

  // Timeline drag logic
  const getTimeFromMouseEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current || !video?.duration_seconds) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pct * video.duration_seconds;
  };

  const handleTimelineMouseDown = (
    e: React.MouseEvent,
    handle: "start" | "end"
  ) => {
    e.preventDefault();
    draggingRef.current = handle;

    const onMove = (ev: MouseEvent) => {
      const t = getTimeFromMouseEvent(ev);
      if (t === null) return;
      if (draggingRef.current === "start") {
        setClipStart(Math.min(t, clipEnd - 0.5));
      } else {
        setClipEnd(Math.max(t, clipStart + 0.5));
      }
    };

    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const clipDuration = clipEnd - clipStart;
  const totalDuration = video?.duration_seconds || clipEnd + 10;
  const startPct = (clipStart / totalDuration) * 100;
  const endPct = (clipEnd / totalDuration) * 100;
  const currentPct = (currentTime / totalDuration) * 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // Active (non-deleted) words for subtitle display
  // Word timestamps are 0-based (relative to original clip start).
  // When user adjusts ±1s, calculate offset to filter visible words.
  const originalDuration = originalClipEnd - originalClipStart;
  const startOffset = clipStart - originalClipStart; // negative = extended earlier
  const endOffset = clipEnd - originalClipEnd; // positive = extended later

  const visibleWords = transcript.map((w, idx) => ({
    ...w,
    idx,
    inRange: w.start >= startOffset && w.end <= originalDuration + endOffset,
  }));
  const inRangeCount = visibleWords.filter((w) => w.inRange).length;
  const extendedBeyond = clipStart < originalClipStart || clipEnd > originalClipEnd;

  const activeWords = transcript.filter((w) => !w.deleted);
  // relativeTime: subtitle timestamps are relative to clip start (0-based)
  const relativeTime = currentTime - clipStart;

  // Auto-scroll to active word in transcript
  useEffect(() => {
    if (activeWordRef.current && transcriptScrollRef.current) {
      const container = transcriptScrollRef.current;
      const el = activeWordRef.current;
      const top = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [currentTime]);

  // Debounced re-transcription when timeline changes
  useEffect(() => {
    if (!video?.file_path || !clip) return;
    const hasChanged = clipStart !== originalClipStart || clipEnd !== originalClipEnd;
    if (!hasChanged) return;

    if (retranscribeTimerRef.current) {
      clearTimeout(retranscribeTimerRef.current);
    }

    retranscribeTimerRef.current = setTimeout(async () => {
      setRetranscribing(true);
      try {
        const res = await apiFetch("/transcribe-segment", {
          video_storage_path: video.file_path,
          start_time: clipStart,
          end_time: clipEnd,
          clip_id: clip.id,
        });
        if (!res.ok) {
          console.error("Re-transcription failed:", res.status);
          return;
        }
        const data = await res.json();
        if (data.success && data.words && data.words.length > 0) {
          setTranscript(
            data.words.map((w: any) => ({
              word: w.word,
              start: w.start,
              end: w.end,
              deleted: false,
              edited: false,
            }))
          );
          setOriginalClipStart(clipStart);
          setOriginalClipEnd(clipEnd);
          console.log(`✅ Re-transcribed: ${data.word_count} words`);
        }
      } catch (err) {
        console.error("Re-transcription error:", err);
      } finally {
        setRetranscribing(false);
      }
    }, 1200);

    return () => {
      if (retranscribeTimerRef.current) {
        clearTimeout(retranscribeTimerRef.current);
      }
    };
  }, [clipStart, clipEnd]);

  // iOS video render fix — nudge video to render first frame
  useEffect(() => {
    const el = mobileVideoRef.current;
    if (!el || !signedUrl) return;
    
    const handleCanPlay = () => {
      if (el.currentTime === 0) {
        el.currentTime = 0.001;
      }
    };
    
    el.addEventListener('canplay', handleCanPlay);
    return () => el.removeEventListener('canplay', handleCanPlay);
  }, [signedUrl]);

  // Smooth video seek when clip boundaries change (while paused)
  useEffect(() => {
    const el = getActiveVideoEl();
    if (!el || playing) return;
    if (el.currentTime < clipStart || el.currentTime > clipEnd) {
      el.currentTime = clipStart;
    }
  }, [clipStart, clipEnd]);

  // Save changes — persist start_time, end_time, caption_style, and transcription to DB
  const handleSave = async () => {
    if (!clip) return;
    setSaving(true);
    try {
      const editedTranscription = transcript
        .filter((w) => !w.deleted)
        .map((w) => w.word)
        .join(" ");

      const { error } = await supabase
        .from("clips")
        .update({
          start_time: clipStart.toFixed(3),
          end_time: clipEnd.toFixed(3),
          duration_seconds: Math.round(clipDuration),
          duration: `${Math.floor(clipDuration / 60)}:${Math.floor(clipDuration % 60).toString().padStart(2, "0")}`,
          caption_style: captionStyle,
          transcription: editedTranscription,
          transcription_words: transcript
            .filter(w => !w.deleted)
            .map(w => ({ word: w.word, start: w.start, end: w.end })),
        } as any)
        .eq("id", clip.id);
      if (error) throw error;
      toast.success("Changes saved!");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Render clip — credit gated
  const handleRenderConfirm = async () => {
    if (!clip || !video) return;
    setRendering(true);
    try {
      const editedTranscription = transcript
        .filter((w) => !w.deleted)
        .map((w) => w.word)
        .join(" ");

      await supabase
        .from("clips")
        .update({
          status: "queued",
          start_time: clipStart.toFixed(3),
          end_time: clipEnd.toFixed(3),
          caption_style: captionStyle,
          transcription: editedTranscription,
        } as any)
        .eq("id", clip.id);

      const res = await apiFetch("/render", {
        clip_id: clip.id,
        video_storage_path: video.file_path,
        start_time: clipStart,
        end_time: clipEnd,
        caption_style: captionStyle || "hormozi",
        custom_transcription: editedTranscription || undefined,
        custom_color: customColor || undefined,
        crop_x: (clip.viral_analysis as Record<string, unknown> | null)?.face_x ?? 0.5,
        subtitle_size: subtitleSize,
        subtitle_y: subtitleY,
      });
      if (!res.ok) throw new Error("Render request failed");

      // Deduct 1 credit — only after successful render request
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("increment_used_credits" as any, { _user_id: user.id });
        refetchCredits();
      }
      toast.success("Clip sent for rendering!");
      navigate(`/dashboard/videos/${video.id}`);
    } catch {
      toast.error("Failed to start rendering");
    } finally {
      setRendering(false);
      setCreditDialogOpen(false);
    }
  };

  const handleRender = () => {
    setCreditDialogOpen(true);
  };

  const handleWordEdit = (idx: number, newWord: string) => {
    setTranscript((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, word: newWord, edited: true } : w))
    );
    setEditingWordIdx(null);
  };

  const toggleWordDelete = (idx: number) => {
    setTranscript((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, deleted: !w.deleted } : w))
    );
  };

  if (!clip || !video) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-24 sm:pb-0" style={{ background: "#0F0F1A" }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/videos/review/${video.id}`)}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-lg font-bold truncate">
            <span className="gradient-text">Remix</span> — {clip.title}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="min-h-[36px]">
              <Save className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
            </Button>
            <Button variant="hero" size="sm" onClick={handleRender} disabled={rendering} className="min-h-[36px]">
              <Zap className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{rendering ? "Rendering..." : "Render"}</span>
            </Button>
          </div>
          {(credits?.plan === "free" || !credits?.plan) && (
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
              Free plan — rendered clips include a CutViral.ai watermark.
              <Link to="/dashboard/upgrade" className="text-primary hover:underline ml-0.5">Upgrade</Link>
            </p>
          )}
        </div>
      </div>

      {/* Main editor area — vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-auto lg:overflow-hidden">
        {/* TOP/LEFT: Video preview */}
        <div className="w-full lg:w-[60%] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-background/50 flex-shrink-0 lg:flex-shrink">
          {/* Mobile: plain video player, no phone frame */}
          <div className="relative w-full max-w-[360px] mx-auto block sm:hidden">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {signedUrl && (
                <video
                  ref={mobileVideoRef}
                  src={signedUrl}
                  className="w-full h-full object-cover"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => { setPlaying(false); }}
                  muted={muted}
                  playsInline
                  preload="auto"
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                  crossOrigin="anonymous"
                />
              )}
              {/* Reload button — fixes freeze where audio continues but frame stalls */}
              <button
                onClick={handleReload}
                className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Reload video"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white/80" />
              </button>
              {/* Live subtitles — mobile */}
              {activeWords.length > 0 && (
                <LiveSubtitles
                  words={activeWords}
                  relativeTime={relativeTime}
                  captionStyle={captionStyle}
                  customColor={customColor}
                />
              )}
              {!playing && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
                  <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </button>
                    <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <span className="text-xs text-white/80 font-mono">{formatTime(Math.max(0, currentTime - clipStart))} / {formatTime(clipDuration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: phone mockup */}
          <div className="relative flex-shrink-0 hidden sm:block">
            {/* Phone mockup */}
            <div
              className="relative rounded-[2.5rem] p-3 w-[280px]"
              style={{
                background:
                  "linear-gradient(145deg, hsl(240,15%,16%), hsl(240,15%,10%))",
                boxShadow:
                  "0 25px 60px -10px rgba(0,0,0,0.6), 0 0 40px -10px hsl(349,100%,59%,0.15), inset 0 1px 0 hsl(0,0%,100%,0.08)",
              }}
            >
              {/* Notch */}
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10"
                style={{ background: "hsl(240,15%,8%)" }}
              />

              {/* Screen */}
              <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-black">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {signedUrl && (
                  <video
                    ref={videoRef}
                    src={signedUrl}
                    className="w-full h-full object-contain rounded-lg"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => { setPlaying(false); }}
                    muted={muted}
                    playsInline
                    controls
                    preload="auto"
                  />
                )}

                {/* Interactive subtitle preview */}
                <div className="absolute inset-0 pointer-events-none z-[5]">
                  <div
                    className={cn(
                      "text-center px-2 py-1 rounded mx-4 transition-all duration-200",
                      sizeMap[subtitleSize]
                    )}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${subtitleY * 100}%`,
                      color: customColor ? `#${customColor}` : currentStyleColors.color,
                      backgroundColor: currentStyleColors.bg,
                      fontWeight: currentStyleColors.fontWeight,
                      fontStyle: captionStyle === "elegant" ? "italic" : "normal",
                      textShadow: captionStyle === "neon"
                        ? `0 0 10px ${currentStyleColors.color}, 0 0 20px ${currentStyleColors.color}`
                        : "1px 1px 2px rgba(0,0,0,0.8)",
                      maxWidth: '90%',
                    }}
                  >
                    {previewText}
                  </div>
                </div>
                {/* Reload button — fixes freeze */}
                <button
                  onClick={handleReload}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                  title="Reload video"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white/80" />
                </button>

                {/* Live subtitles — desktop */}
                {activeWords.length > 0 && (
                  <LiveSubtitles
                    words={activeWords}
                    relativeTime={relativeTime}
                    captionStyle={captionStyle}
                    customColor={customColor}
                  />
                )}

                {/* Play overlay */}
                {!playing && !loading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={togglePlay}
                  >
                    <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
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
                      {formatTime(Math.max(0, currentTime - clipStart))} /{" "}
                      {formatTime(clipDuration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Subtitle info text below phone */}
            <p className="text-center text-xs mt-3 px-2" style={{ color: "hsl(var(--muted-foreground)/0.6)" }}>
              🌍 Subtitles auto-detected in video's language
            </p>
          </div>
        </div>

        {/* BOTTOM/RIGHT: Editor controls */}
        <div className="w-full lg:w-[40%] border-t lg:border-t-0 lg:border-l border-border/50 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-5">

            {/* Detected language badge */}
            {(() => {
              const analysis = clip.viral_analysis as Record<string, unknown> | null;
              const lang = analysis?.detected_language as string | undefined;
              if (!lang) return null;
              const langNames: Record<string, string> = {
                en: "English", es: "Spanish", uk: "Ukrainian", fr: "French",
                de: "German", pt: "Portuguese", ja: "Japanese", ko: "Korean",
                ar: "Arabic", hi: "Hindi", zh: "Chinese", ru: "Russian",
                it: "Italian", nl: "Dutch", pl: "Polish", tr: "Turkish",
              };
              const displayName = langNames[lang] || lang.toUpperCase();
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: "hsl(var(--accent)/0.08)", border: "1px solid hsl(var(--accent)/0.2)" }}>
                  <span>🌍</span>
                  <span className="text-accent/90">Detected: <strong className="text-accent">{displayName}</strong></span>
                </div>
              );
            })()}

            {/* 1. TIMELINE */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Timeline
                </h3>
                {(clipStart !== originalClipStart || clipEnd !== originalClipEnd) && (
                  <button
                    onClick={() => {
                      setClipStart(originalClipStart);
                      setClipEnd(originalClipEnd);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Waveform-style timeline — horizontal scroll on mobile */}
              <div className="overflow-x-auto">
                <div
                  ref={timelineRef}
                  className="relative h-16 rounded-lg overflow-hidden cursor-crosshair"
                  style={{ background: "hsl(240,15%,8%)", minWidth: "280px" }}
                >
                  {/* Fake waveform bars */}
                  <div className="absolute inset-0 flex items-center gap-px px-1">
                    {Array.from({ length: 80 }).map((_, i) => {
                      const pct = (i / 80) * 100;
                      const inRange = pct >= startPct && pct <= endPct;
                      const h = 15 + Math.sin(i * 0.7) * 25 + Math.cos(i * 1.3) * 15;
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-colors duration-150"
                          style={{
                            height: `${Math.max(8, h)}%`,
                            background: inRange
                              ? "hsl(349, 100%, 59%)"
                              : "hsl(240,15%,20%)",
                            opacity: inRange ? 0.8 : 0.4,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Selected region overlay */}
                  <div
                    className="absolute top-0 bottom-0 border-y-2 border-primary/60"
                    style={{
                      left: `${startPct}%`,
                      width: `${endPct - startPct}%`,
                      background: "hsl(349,100%,59%,0.08)",
                    }}
                  />

                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center justify-center"
                    style={{ left: `calc(${startPct}% - 6px)` }}
                    onMouseDown={(e) => handleTimelineMouseDown(e, "start")}
                  >
                    <div className="w-1 h-full bg-primary rounded-full group-hover:w-1.5 transition-all shadow-[0_0_8px_hsl(349,100%,59%,0.5)]" />
                    <GripVertical className="absolute w-3 h-3 text-primary" />
                  </div>

                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center justify-center"
                    style={{ left: `calc(${endPct}% - 6px)` }}
                    onMouseDown={(e) => handleTimelineMouseDown(e, "end")}
                  >
                    <div className="w-1 h-full bg-primary rounded-full group-hover:w-1.5 transition-all shadow-[0_0_8px_hsl(349,100%,59%,0.5)]" />
                    <GripVertical className="absolute w-3 h-3 text-primary" />
                  </div>

                  {/* Playhead */}
                  {currentTime >= clipStart && currentTime <= clipEnd && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                      style={{ left: `${currentPct}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* Time display with ±1s buttons */}
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                {/* Start time controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClipStart(s => Math.max(0, s - 1))}
                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="Start -1s"
                  >−1s</button>
                  <span className="text-primary min-w-[56px] text-center">{formatTime(clipStart)}</span>
                  <button
                    onClick={() => setClipStart(s => Math.min(clipEnd - 0.5, s + 1))}
                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="Start +1s"
                  >+1s</button>
                  {clipStart !== originalClipStart && (
                    <span className="text-[10px] text-primary/80 font-mono ml-0.5">
                      {clipStart < originalClipStart ? `−${(originalClipStart - clipStart).toFixed(0)}s` : `+${(clipStart - originalClipStart).toFixed(0)}s`}
                    </span>
                  )}
                </div>

                <span className="text-foreground/50 text-[10px]">{formatTime(clipDuration)}</span>

                {/* End time controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClipEnd(e => Math.max(clipStart + 0.5, e - 1))}
                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="End -1s"
                  >−1s</button>
                  <span className="text-primary min-w-[56px] text-center">{formatTime(clipEnd)}</span>
                  <button
                    onClick={() => setClipEnd(e => Math.min(totalDuration, e + 1))}
                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="End +1s"
                  >+1s</button>
                  {clipEnd !== originalClipEnd && (
                    <span className="text-[10px] text-primary/80 font-mono ml-0.5">
                      {clipEnd > originalClipEnd ? `+${(clipEnd - originalClipEnd).toFixed(0)}s` : `−${(originalClipEnd - clipEnd).toFixed(0)}s`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. CAPTION STYLE */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Caption Style
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible scrollbar-hide">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setCaptionStyle(style.id);
                      setCustomColor("");
                    }}
                    className={`flex-shrink-0 w-[100px] lg:w-auto rounded-lg p-2.5 text-center transition-all duration-200 border ${
                      captionStyle === style.id && !customColor
                        ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_hsl(349,100%,59%,0.15)]"
                        : "border-border/30 bg-muted/20 hover:border-border/60"
                    }`}
                  >
                    <div
                      className="text-xs font-bold mb-0.5"
                      style={{ color: style.color, textShadow: "1px 1px 0 #000" }}
                    >
                      {style.label}
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
                      {style.preview}
                    </p>
                  </button>
                ))}
              </div>
              {/* Custom color picker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">Custom color:</span>
                <div className="flex gap-1.5">
                  {["#FF5500", "#00BFFF", "#FF69B4", "#8B5CF6", "#10B981", "#FACC15"].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => {
                        setCustomColor(hex.replace("#", ""));
                        setCaptionStyle("custom" as CaptionStyle);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        customColor === hex.replace("#", "")
                          ? "border-white scale-110"
                          : "border-transparent hover:border-white/50"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                {customColor && (
                  <button
                    onClick={() => { setCustomColor(""); setCaptionStyle("hormozi"); }}
                    className="text-[10px] text-muted-foreground hover:text-primary ml-auto"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Caption Size */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Caption Size
              </label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSubtitleSize(size)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      subtitleSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {size === "small" ? "S" : size === "medium" ? "M" : "L"}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Position */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Caption Position
                </label>
                <button
                  onClick={() => setSubtitleY(0.85)}
                  className="text-[10px] text-primary hover:underline"
                >
                  Reset
                </button>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={subtitleY * 100}
                onChange={(e) => setSubtitleY(Number(e.target.value) / 100)}
                className="w-full h-1.5 accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>↑ Top</span>
                <span>Bottom ↓</span>
              </div>
            </div>

            {/* 2.5 AI TITLES & HASHTAGS */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <button
                onClick={() => setAiExpanded(!aiExpanded)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AI Title & Hashtags
                </h3>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${aiExpanded ? "rotate-180" : ""}`} />
              </button>

              {aiExpanded && (
                <div className="space-y-3 pt-1">
                  {/* Platform selector */}
                  <div className="flex gap-1.5">
                    {(["tiktok", "youtube", "instagram"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAiPlatform(p)}
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          aiPlatform === p
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted/20 text-muted-foreground border border-transparent hover:border-border/40"
                        }`}
                      >
                        {p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Instagram"}
                      </button>
                    ))}
                  </div>

                  {/* Generate button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      if (!clip?.transcription && transcript.length === 0) {
                        toast.error("No transcript available yet");
                        return;
                      }
                      setAiLoading(true);
                      setAiExpanded(true);
                      try {
                        const text = transcript
                          .filter(w => !w.deleted)
                          .map(w => w.word)
                          .join(" ") || clip?.transcription || "";
                        const res = await apiFetch("/generate-titles", {
                          clip_id: clip!.id,
                          transcription: text,
                          platform: aiPlatform,
                        });
                        const data = await res.json();
                        if (data.success) {
                          setAiTitles(data.titles || []);
                          setAiHashtags(data.hashtags || []);
                          setAiDescription(data.description || "");
                          toast.success(`Generated titles for ${aiPlatform}!`);
                        } else {
                          toast.error("Failed to generate titles");
                        }
                      } catch {
                        toast.error("AI generation failed");
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                        Generate Titles
                      </>
                    )}
                  </Button>

                  {/* Results */}
                  {aiTitles.length > 0 && (
                    <div className="space-y-2">
                      {aiTitles.map((title, i) => (
                        <div
                          key={i}
                          className="group relative rounded-lg bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(title.text);
                            toast.success("Copied to clipboard!");
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                              {title.style}
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">{title.text}</p>
                          </div>
                          <span className="absolute top-2 right-2 text-[9px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to copy
                          </span>
                        </div>
                      ))}

                      {/* Hashtags */}
                      {aiHashtags.length > 0 && (
                        <div
                          className="flex flex-wrap gap-1 cursor-pointer rounded-lg bg-muted/20 p-2"
                          onClick={() => {
                            navigator.clipboard.writeText(aiHashtags.join(" "));
                            toast.success("Hashtags copied!");
                          }}
                        >
                          {aiHashtags.map((tag, i) => (
                            <span key={i} className="text-[11px] text-primary/80 bg-primary/10 rounded px-1.5 py-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      {aiDescription && (
                        <div
                          className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(aiDescription);
                            toast.success("Description copied!");
                          }}
                        >
                          {aiDescription}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. TEXT EDITOR */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("clipEdit.transcriptEditor")}
                </h3>
                {transcript.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {inRangeCount} of {transcript.length} words
                  </span>
                )}
              </div>
              {transcript.length === 0 ? (
                transcriptLoading ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">{t("clipEdit.transcriptGenerating")}</p>
                    <p className="text-[10px] text-muted-foreground/50">{t("clipEdit.transcriptGeneratingHint")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <span className="text-2xl">🎙️</span>
                    <p className="text-xs text-muted-foreground">
                      {t("clipEdit.transcriptAfterRender")}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {t("clipEdit.transcriptAfterRenderHint")}
                    </p>
                  </div>
                )
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Click a word to edit. Right-click to delete/restore.
                  </p>
                  <div className="relative">
                    {retranscribing && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-muted-foreground">Updating subtitles...</span>
                        </div>
                      </div>
                    )}
                    <div
                      ref={transcriptScrollRef}
                      className="flex flex-wrap gap-1 max-h-[400px] overflow-y-auto pr-1"
                    >
                    {visibleWords.map((w) => {
                      const isCurrent =
                        !w.deleted && w.inRange && relativeTime >= w.start && relativeTime <= w.end + 0.1;

                      if (editingWordIdx === w.idx) {
                        return (
                          <input
                            key={w.idx}
                            autoFocus
                            defaultValue={w.word}
                            className="bg-primary/20 border border-primary/40 rounded px-1.5 py-0.5 text-sm text-foreground outline-none w-20"
                            onBlur={(e) => handleWordEdit(w.idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleWordEdit(w.idx, (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingWordIdx(null);
                            }}
                          />
                        );
                      }

                      return (
                        <span
                          key={w.idx}
                          ref={isCurrent ? activeWordRef : undefined}
                          onClick={() => w.inRange && !w.deleted && setEditingWordIdx(w.idx)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (w.inRange) toggleWordDelete(w.idx);
                          }}
                          className={`px-1 py-0.5 rounded text-sm cursor-pointer transition-all duration-150 select-none ${
                            w.deleted
                              ? "line-through opacity-50 text-destructive bg-destructive/10"
                              : !w.inRange
                                ? "text-muted-foreground/30 cursor-default"
                                : isCurrent
                                  ? "bg-primary/30 text-foreground ring-2 ring-primary/60"
                                  : w.edited
                                    ? "bg-yellow-500/20 ring-1 ring-yellow-500/50 text-foreground hover:bg-yellow-500/30"
                                    : "text-foreground/80 hover:bg-muted/40"
                          }`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                    </div>
                  </div>
                  {extendedBeyond && !retranscribing && (
                    <p className="text-[10px] text-muted-foreground/50 italic">
                      Extended section — subtitles will be re-generated on render
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 4. ACTIONS (mobile-friendly repeated at bottom) */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="hero"
                  className="w-full justify-start"
                  onClick={handleRender}
                  disabled={rendering}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {rendering ? "Rendering..." : "Render This Clip"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() =>
                    navigate(`/dashboard/videos/review/${video.id}`)
                  }
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RenderCreditDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        onConfirm={handleRenderConfirm}
        creditsRequired={1}
        creditsRemaining={credits?.remaining ?? 0}
        loading={rendering}
      />
    </div>
  );
};

export default ClipEdit;

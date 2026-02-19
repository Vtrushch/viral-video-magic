import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";

type CaptionStyle = "hormozi" | "mrbeast" | "minimal";

const CAPTION_STYLES: { id: CaptionStyle; label: string; preview: string }[] = [
  {
    id: "hormozi",
    label: "Hormozi",
    preview: "BOLD YELLOW with black outline, word-by-word highlight",
  },
  {
    id: "mrbeast",
    label: "MrBeast",
    preview: "White with colored keyword pop, large & centered",
  },
  {
    id: "minimal",
    label: "Minimal",
    preview: "Clean white subtitle, lower-third placement",
  },
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
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [retranscribing, setRetranscribing] = useState(false);
  const retranscribeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const { credits, refetch: refetchCredits } = useCredits();

  const { t } = useTranslation();

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

  // Fetch video
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

// Init clip boundaries and load transcription words
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
      // No transcript yet — show loading spinner; the query will poll every 3s
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
    <div className="flex flex-col min-h-full" style={{ background: "#0F0F1A" }}>
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
      </div>

      {/* Main editor area — vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-auto lg:overflow-hidden">
        {/* TOP/LEFT: Video preview */}
        <div className="w-full lg:w-[60%] flex items-center justify-center p-4 sm:p-6 bg-background/50 flex-shrink-0 lg:flex-shrink">
          {/* Mobile: plain video player, no phone frame */}
          <div className="relative w-full max-w-[340px] block sm:hidden">
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
                    className="w-full h-full object-cover"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => { setPlaying(false); }}
                    muted={muted}
                    playsInline
                    preload="auto"
                  />
                )}
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
                    className="w-7 h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="Start -1s"
                  >−1s</button>
                  <span className="text-primary min-w-[56px] text-center">{formatTime(clipStart)}</span>
                  <button
                    onClick={() => setClipStart(s => Math.min(clipEnd - 0.5, s + 1))}
                    className="w-7 h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
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
                    className="w-7 h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
                    title="End -1s"
                  >−1s</button>
                  <span className="text-primary min-w-[56px] text-center">{formatTime(clipEnd)}</span>
                  <button
                    onClick={() => setClipEnd(e => Math.min(totalDuration, e + 1))}
                    className="w-7 h-7 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center justify-center text-[10px] font-bold"
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
              <div className="grid grid-cols-3 gap-2">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setCaptionStyle(style.id)}
                    className={`rounded-lg p-3 text-center transition-all duration-200 border ${
                      captionStyle === style.id
                        ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(349,100%,59%,0.15)]"
                        : "border-border/30 bg-muted/20 hover:border-border/60"
                    }`}
                  >
                    <div
                      className="text-sm font-bold mb-1"
                      style={
                        style.id === "hormozi"
                          ? { color: "#FFD600", textShadow: "1px 1px 0 #000" }
                          : style.id === "mrbeast"
                            ? { color: "#FFF", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }
                            : { color: "#FFF" }
                      }
                    >
                      {style.label}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {style.preview}
                    </p>
                  </button>
                ))}
              </div>
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

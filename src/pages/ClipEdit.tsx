import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Save,
  Zap,
  GripVertical,
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

// Word group size for caption display
const WORD_GROUP_SIZE = 3;

// Mock transcript words (in production these come from analysis)
const generateMockTranscript = (startTime: number, endTime: number) => {
  const words = [
    "This", "is", "the", "moment", "that", "changed", "everything",
    "because", "nobody", "expected", "what", "happened", "next",
    "and", "it", "was", "absolutely", "incredible", "to", "watch",
    "the", "whole", "thing", "unfold", "right", "before", "our", "eyes",
  ];
  const duration = endTime - startTime;
  const wordDuration = duration / words.length;
  return words.map((word, i) => ({
    word,
    start: startTime + i * wordDuration,
    end: startTime + (i + 1) * wordDuration,
    deleted: false,
  }));
};

const ClipEdit = () => {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("hormozi");
  const [transcript, setTranscript] = useState<
    { word: string; start: number; end: number; deleted: boolean }[]
  >([]);
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);

  const draggingRef = useRef<"start" | "end" | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch clip
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

    // Try to load real transcription_words from viral_analysis
    const analysis = clip.viral_analysis as Record<string, unknown> | null;
    const realWords = analysis?.transcription_words as
      | { word: string; start: number; end: number }[]
      | undefined;

    if (realWords && Array.isArray(realWords) && realWords.length > 0) {
      setTranscript(realWords.map((w) => ({ ...w, deleted: false })));
    } else {
      setTranscript(generateMockTranscript(s, e));
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

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = clipStart;
    setLoading(false);
  }, [clipStart]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.currentTime >= clipEnd) {
      el.pause();
      el.currentTime = clipStart;
      setPlaying(false);
    }
  }, [clipEnd, clipStart]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      if (el.currentTime < clipStart || el.currentTime >= clipEnd) {
        el.currentTime = clipStart;
      }
      el.play();
      setPlaying(true);
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

  // Build active word groups for caption overlay
  const activeWords = transcript.filter((w) => !w.deleted);

  // Find the current word index within active words
  const currentWordIdx = activeWords.findIndex(
    (w) => currentTime >= w.start && currentTime < w.end + 0.05
  );

  // Determine the 3-word group containing the current word
  const groupStart =
    currentWordIdx >= 0
      ? Math.floor(currentWordIdx / WORD_GROUP_SIZE) * WORD_GROUP_SIZE
      : -1;
  const currentGroup =
    groupStart >= 0
      ? activeWords.slice(groupStart, groupStart + WORD_GROUP_SIZE)
      : [];
  const currentGroupKey =
    groupStart >= 0
      ? currentGroup.map((w) => w.word).join("-") + groupStart
      : "";

  // Save changes
  const handleSave = async () => {
    if (!clip) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clips")
        .update({
          start_time: clipStart.toFixed(3),
          end_time: clipEnd.toFixed(3),
          duration_seconds: Math.round(clipDuration),
          duration: `${Math.floor(clipDuration / 60)}:${Math.floor(clipDuration % 60).toString().padStart(2, "0")}`,
        } as any)
        .eq("id", clip.id);
      if (error) throw error;
      toast.success("Clip changes saved!");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Render clip
  const handleRender = async () => {
    if (!clip || !video) return;
    setRendering(true);
    try {
      await supabase
        .from("clips")
        .update({ status: "queued" } as any)
        .eq("id", clip.id);

      const res = await fetch(
        "https://vtrushch--cutviral-worker-webhook.modal.run/render",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clip_id: clip.id,
            video_storage_path: video.file_path,
            start_time: parseFloat(clip.start_time || "0"),
            end_time: parseFloat(clip.end_time || "0"),
            caption_style: captionStyle || "hormozi",
          }),
        }
      );
      if (!res.ok) throw new Error("Render request failed");
      toast.success("Clip sent for rendering!");
      navigate(`/dashboard/videos/${video.id}`);
    } catch {
      toast.error("Failed to start rendering");
    } finally {
      setRendering(false);
    }
  };

  const handleWordEdit = (idx: number, newWord: string) => {
    setTranscript((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, word: newWord } : w))
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
          <div className="relative flex-shrink-0">
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
                    onEnded={() => setPlaying(false)}
                    muted={muted}
                    playsInline
                  />
                )}

                {/* Caption overlay — 3-word group with per-word highlight */}
                {currentGroup.length > 0 && (
                  <div
                    className="absolute left-2 right-2 text-center pointer-events-none z-20"
                    style={{ bottom: "20%" }}
                  >
                    <div
                      key={currentGroupKey}
                      className="inline-flex flex-wrap justify-center gap-x-1.5 px-2 py-1.5 rounded-lg"
                      style={{
                        background:
                          captionStyle === "minimal"
                            ? "rgba(0,0,0,0.45)"
                            : "rgba(0,0,0,0.3)",
                        backdropFilter: "blur(4px)",
                        animation: "captionPop 0.2s ease-out",
                      }}
                    >
                      {currentGroup.map((w, wi) => {
                        const isActive =
                          currentTime >= w.start && currentTime < w.end + 0.05;

                        // Hormozi: white base, current word YELLOW
                        if (captionStyle === "hormozi") {
                          return (
                            <span
                              key={wi}
                              style={{
                                fontFamily: "Impact, 'Arial Black', sans-serif",
                                fontWeight: 900,
                                fontSize: "1.2rem",
                                color: isActive ? "#FFD600" : "#FFFFFF",
                                textShadow:
                                  "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.5)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                transform: isActive ? "scale(1.15)" : "scale(1)",
                                transition: "transform 0.15s ease, color 0.1s ease",
                                display: "inline-block",
                              }}
                            >
                              {w.word}
                            </span>
                          );
                        }

                        // MrBeast: ALL CAPS, alternating RED/WHITE
                        if (captionStyle === "mrbeast") {
                          const isRed = wi % 2 === 0;
                          return (
                            <span
                              key={wi}
                              style={{
                                fontWeight: 900,
                                fontSize: "1.25rem",
                                color: isActive
                                  ? isRed
                                    ? "#FF3333"
                                    : "#FFFFFF"
                                  : isRed
                                    ? "#FF6666"
                                    : "rgba(255,255,255,0.7)",
                                textShadow:
                                  "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                                transform: isActive ? "scale(1.18)" : "scale(1)",
                                transition: "transform 0.15s ease, color 0.1s ease",
                                display: "inline-block",
                              }}
                            >
                              {w.word}
                            </span>
                          );
                        }

                        // Minimal: clean white, subtle
                        return (
                          <span
                            key={wi}
                            style={{
                              fontWeight: isActive ? 600 : 400,
                              fontSize: "0.95rem",
                              color: isActive
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.65)",
                              textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                              transition:
                                "font-weight 0.15s ease, color 0.1s ease, transform 0.15s ease",
                              transform: isActive ? "scale(1.08)" : "scale(1)",
                              display: "inline-block",
                            }}
                          >
                            {w.word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
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
        </div>
        </div>

        {/* BOTTOM/RIGHT: Editor controls */}
        <div className="w-full lg:w-[40%] border-t lg:border-t-0 lg:border-l border-border/50 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-5">
            {/* 1. TIMELINE */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Timeline
              </h3>

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

              {/* Time display */}
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="text-primary">{formatTime(clipStart)}</span>
                <span className="text-foreground/50">
                  Duration: {formatTime(clipDuration)}
                </span>
                <span className="text-primary">{formatTime(clipEnd)}</span>
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Transcript Editor
              </h3>
              <p className="text-xs text-muted-foreground">
                Click a word to edit. Right-click to delete/restore.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {transcript.map((w, idx) => {
                  const inRange = w.start >= clipStart && w.end <= clipEnd;
                  const isCurrent =
                    currentTime >= w.start && currentTime <= w.end + 0.1;

                  if (editingWordIdx === idx) {
                    return (
                      <input
                        key={idx}
                        autoFocus
                        defaultValue={w.word}
                        className="bg-primary/20 border border-primary/40 rounded px-1.5 py-0.5 text-sm text-foreground outline-none w-20"
                        onBlur={(e) => handleWordEdit(idx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleWordEdit(idx, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingWordIdx(null);
                        }}
                      />
                    );
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() => inRange && setEditingWordIdx(idx)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (inRange) toggleWordDelete(idx);
                      }}
                      className={`px-1.5 py-0.5 rounded text-sm cursor-pointer transition-all select-none ${
                        w.deleted
                          ? "line-through text-muted-foreground/40 bg-destructive/10"
                          : !inRange
                            ? "text-muted-foreground/30"
                            : isCurrent
                              ? "bg-primary/25 text-foreground ring-1 ring-primary/50"
                              : "text-foreground/80 hover:bg-muted/40"
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </div>
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
    </div>
  );
};

export default ClipEdit;

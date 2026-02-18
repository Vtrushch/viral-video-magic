import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, GripVertical, Sparkles, Clock, Loader2, Film, Zap,
  ChevronLeft, ChevronRight, Play, Pause, RefreshCw, Plus, X,
  ChevronRight as BreadcrumbChevron, PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ─── */
interface ClipTiming { startTime: number; endTime: number; }

const CAPTION_STYLES = ["hormozi", "mrbeast", "minimal"] as const;

/* ─── Helpers ─── */
function parseTime(s: string | null | undefined): number {
  return parseFloat(s || "0") || 0;
}
function formatTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function formatDur(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

/* ─── Sortable Clip Item ─── */
function SortableClipItem({
  clip, index, onRemove, isAiRecommended, timing, onAdjustStart, onAdjustEnd, onPreview, isActive,
}: {
  clip: Tables<"clips">;
  index: number;
  onRemove: (id: string) => void;
  isAiRecommended?: boolean;
  timing: ClipTiming;
  onAdjustStart: (id: string, delta: number) => void;
  onAdjustEnd: (id: string, delta: number) => void;
  onPreview: (clip: Tables<"clips">) => void;
  isActive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const duration = Math.max(0, timing.endTime - timing.startTime);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${
        isActive ? "border-primary/60 bg-primary/8" : isDragging ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/40"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none mt-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Index */}
      <span className={`text-xs font-mono w-4 shrink-0 mt-1 ${isActive ? "text-primary font-bold" : "text-muted-foreground/50"}`}>{index + 1}</span>

      {/* Thumbnail */}
      <div className="w-8 h-14 rounded-md overflow-hidden shrink-0">
        <ClipVideoThumbnail
          renderedUrl={clip.status === "ready" && clip.file_path ? clip.file_path : null}
          filePath={null}
          startTime={clip.start_time}
          fallbackImageUrl={clip.thumbnail_url || undefined}
          alt={clip.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info + timing */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <p className="text-xs font-medium text-foreground truncate">{clip.title}</p>
          {isAiRecommended && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.3)" }}>
              <Zap className="w-2 h-2" /> AI
            </span>
          )}
          {clip.viral_score != null && (
            <span className="text-[9px] text-accent">⚡{clip.viral_score}</span>
          )}
        </div>

        {/* Timing controls */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/60 w-7 shrink-0">Start</span>
            <button onClick={() => onAdjustStart(clip.id, -1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.startTime)}</span>
            <button onClick={() => onAdjustStart(clip.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/60 w-7 shrink-0">End</span>
            <button onClick={() => onAdjustEnd(clip.id, -1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.endTime)}</span>
            <button onClick={() => onAdjustEnd(clip.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground/50">{duration.toFixed(0)}s</p>
        </div>
      </div>

      {/* Preview button */}
      <button
        onClick={() => onPreview(clip)}
        className="text-muted-foreground/50 hover:text-primary transition-colors shrink-0 mt-1"
        title="Preview this clip"
      >
        <Play className="w-3.5 h-3.5" />
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(clip.id)}
        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Main Page ─── */
export default function HighlightReelPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { videoId, reelId } = useParams<{ videoId?: string; reelId?: string }>();
  const isEditing = !!reelId;

  /* Data */
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [clips, setClips] = useState<Tables<"clips">[]>([]);
  const [reel, setReel] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  /* Video player */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playAllIndex, setPlayAllIndex] = useState<number | null>(null); // null = not in Play All mode

  /* Editor state */
  const [title, setTitle] = useState("My Highlight Reel");
  const [captionStyle, setCaptionStyle] = useState<string>("hormozi");
  const [addTransitions, setAddTransitions] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [timingOverrides, setTimingOverrides] = useState<Record<string, ClipTiming>>({});
  const [saving, setSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null); // which clip is being previewed

  /* Load data */
  useEffect(() => {
    async function load() {
      setLoadingData(true);
      try {
        let vid: Tables<"videos"> | null = null;
        let reelData: any = null;

        if (isEditing && reelId) {
          const { data: r } = await supabase.from("highlight_reels" as any).select("*").eq("id", reelId).single();
          reelData = r;
          if (reelData) {
            const { data: v } = await supabase.from("videos").select("*").eq("id", reelData.video_id).single();
            vid = v;
            setReel(reelData);
            setTitle(reelData.title);
            setCaptionStyle(reelData.caption_style || "hormozi");
            setAddTransitions(reelData.add_transitions ?? true);
            setSelectedIds(reelData.clip_ids || []);
          }
        } else if (videoId) {
          const { data: v } = await supabase.from("videos").select("*").eq("id", videoId).single();
          vid = v;
        }

        if (vid) {
          setVideo(vid);
          // Load clips
          const { data: clipsData } = await supabase
            .from("clips")
            .select("*")
            .eq("video_id", vid.id)
            .order("viral_score", { ascending: false });

          const loadedClips = (clipsData || []) as Tables<"clips">[];
          setClips(loadedClips);

          // Init timing overrides
          const init: Record<string, ClipTiming> = {};
          loadedClips.forEach((c) => {
            init[c.id] = { startTime: parseTime(c.start_time), endTime: parseTime(c.end_time) };
          });
          setTimingOverrides(init);

          // If new reel (not editing), auto-select top 3
          if (!isEditing) {
            const top3 = loadedClips
              .filter((c) => c.viral_score != null)
              .slice(0, 3)
              .map((c) => c.id);
            setSelectedIds(top3);
            setAiRecommendedIds(top3);
            setTitle(`Best of ${vid.title}`);
          }
        }
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [isEditing, reelId, videoId]);

  /* Signed URL */
  useEffect(() => {
    if (!video?.file_path) return;
    supabase.storage
      .from("raw-videos")
      .createSignedUrl(video.file_path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setSignedUrl(data.signedUrl); });
  }, [video?.file_path]);

  /* ─── Derived ─── */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedClips = useMemo(
    () => selectedIds.map((id) => clips.find((c) => c.id === id)!).filter(Boolean),
    [selectedIds, clips]
  );

  const availableClips = useMemo(
    () => clips.filter((c) => !selectedIds.includes(c.id)),
    [clips, selectedIds]
  );

  const totalDuration = useMemo(
    () => selectedClips.reduce((sum, c) => {
      const t = timingOverrides[c.id];
      return sum + (t ? Math.max(0, t.endTime - t.startTime) : (c.duration_seconds || 0));
    }, 0),
    [selectedClips, timingOverrides]
  );

  /* ─── Video player helpers ─── */
  const seekAndPlay = useCallback((startSec: number, endSec: number, clipId?: string) => {
    const el = videoRef.current;
    if (!el) return;
    setPlayAllIndex(null);
    setActiveClipId(clipId || null);
    el.pause();
    el.currentTime = startSec;
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      el.play().catch(() => {});
      setPlaying(true);
    };
    el.addEventListener("seeked", onSeeked);
  }, []);

  const handlePreviewClip = useCallback((clip: Tables<"clips">) => {
    const timing = timingOverrides[clip.id] || { startTime: parseTime(clip.start_time), endTime: parseTime(clip.end_time) };
    seekAndPlay(timing.startTime, timing.endTime, clip.id);
  }, [timingOverrides, seekAndPlay]);

  // Play All logic
  const handlePlayAll = useCallback(() => {
    if (selectedClips.length === 0) return;
    setPlayAllIndex(0);
    const first = selectedClips[0];
    const timing = timingOverrides[first.id] || { startTime: parseTime(first.start_time), endTime: parseTime(first.end_time) };
    setActiveClipId(first.id);
    seekAndPlay(timing.startTime, timing.endTime, first.id);
  }, [selectedClips, timingOverrides, seekAndPlay]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);

    // Play All mode: auto-advance to next clip when current clip ends
    if (playAllIndex !== null) {
      const currentClip = selectedClips[playAllIndex];
      if (!currentClip) return;
      const timing = timingOverrides[currentClip.id] || { startTime: parseTime(currentClip.start_time), endTime: parseTime(currentClip.end_time) };
      if (el.currentTime >= timing.endTime - 0.1) {
        const nextIndex = playAllIndex + 1;
        if (nextIndex < selectedClips.length) {
          setPlayAllIndex(nextIndex);
          const nextClip = selectedClips[nextIndex];
          const nextTiming = timingOverrides[nextClip.id] || { startTime: parseTime(nextClip.start_time), endTime: parseTime(nextClip.end_time) };
          setActiveClipId(nextClip.id);
          el.currentTime = nextTiming.startTime;
        } else {
          el.pause();
          setPlaying(false);
          setPlayAllIndex(null);
          setActiveClipId(null);
        }
      }
    }
  }, [playAllIndex, selectedClips, timingOverrides]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().catch(() => {}); setPlaying(true); }
  }, [playing]);

  /* ─── Editor actions ─── */
  const adjustStart = useCallback((id: string, delta: number) => {
    setTimingOverrides((prev) => {
      const t = prev[id];
      if (!t) return prev;
      const newStart = Math.max(0, t.startTime + delta);
      if (newStart >= t.endTime - 1) return prev;
      return { ...prev, [id]: { ...t, startTime: newStart } };
    });
  }, []);

  const adjustEnd = useCallback((id: string, delta: number) => {
    setTimingOverrides((prev) => {
      const t = prev[id];
      if (!t) return prev;
      const clipEndMax = parseTime(clips.find((c) => c.id === id)?.end_time) + 30;
      const newEnd = Math.min(clipEndMax, t.endTime + delta);
      if (newEnd <= t.startTime + 1) return prev;
      return { ...prev, [id]: { ...t, endTime: newEnd } };
    });
  }, [clips]);

  const removeFromSelected = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    if (activeClipId === id) setActiveClipId(null);
  };

  const addClip = (id: string) => {
    if (selectedIds.length >= 10) { toast.warning("Maximum 10 clips per reel"); return; }
    setSelectedIds((prev) => [...prev, id]);
    setShowAddPanel(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (selectedIds.length < 2) { toast.error("Select at least 2 clips"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const clipsPayload = selectedClips.map((c) => {
        const t = timingOverrides[c.id];
        return {
          clip_id: c.id,
          start_time: t ? t.startTime : parseTime(c.start_time),
          end_time: t ? t.endTime : parseTime(c.end_time),
        };
      });

      let reelRowId: string;
      const videoIdForReel = video!.id;

      if (isEditing && reelId) {
        const { error } = await supabase
          .from("highlight_reels" as any)
          .update({
            title,
            clip_ids: selectedIds,
            clip_order: selectedIds.map((_, i) => i),
            caption_style: captionStyle,
            add_transitions: addTransitions,
            status: "pending",
            file_path: null,
            rendered_at: null,
          })
          .eq("id", reelId);
        if (error) throw error;
        reelRowId = reelId;
      } else {
        const { data: newReel, error } = await supabase
          .from("highlight_reels" as any)
          .insert({
            user_id: user.id,
            video_id: videoIdForReel,
            title,
            clip_ids: selectedIds,
            clip_order: selectedIds.map((_, i) => i),
            caption_style: captionStyle,
            add_transitions: addTransitions,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;
        reelRowId = (newReel as any).id;
      }

      // Fire-and-forget to Modal worker
      fetch("https://vtrushch--cutviral-worker-webhook.modal.run/create-highlight-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reel_id: reelRowId,
          video_storage_path: video!.file_path,
          clips: clipsPayload,
          caption_style: captionStyle,
          add_transitions: addTransitions,
        }),
      }).catch(() => {});

      toast.success(t("highlightReel.rendering"));
      navigate(`/dashboard/videos/${videoIdForReel}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save highlight reel");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Play All indicator ─── */
  const playAllClipNumber = playAllIndex !== null ? playAllIndex + 1 : null;
  const playAllClipTitle = playAllIndex !== null ? selectedClips[playAllIndex]?.title : null;

  /* ─── Loading state ─── */
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Video not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full" style={{ background: "hsl(240,15%,7%)" }}>
      {/* ─── Header bar ─── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 flex-shrink-0" style={{ background: "hsl(240,15%,9%)" }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-0">
          <Link to="/dashboard" className="hover:text-foreground transition-colors shrink-0">Videos</Link>
          <BreadcrumbChevron className="w-3 h-3 shrink-0 opacity-50" />
          <Link to={`/dashboard/videos/${video.id}`} className="hover:text-foreground transition-colors truncate max-w-[120px]">{video.title}</Link>
          <BreadcrumbChevron className="w-3 h-3 shrink-0 opacity-50" />
          <span className="text-foreground font-medium shrink-0">
            {isEditing ? t("highlightReel.editor") : t("highlightReel.create")}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/videos/${video.id}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("upload.cancel")}</span>
          </Button>
          <Button
            variant="hero"
            size="sm"
            onClick={handleSubmit}
            disabled={selectedIds.length < 2 || saving}
            className="min-w-[140px]"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditing ? "Saving..." : "Creating..."}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{isEditing ? t("highlightReel.saveAndRender") : t("highlightReel.createReel")}</>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Main layout ─── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-auto lg:overflow-hidden">

        {/* LEFT: Video player (60%) */}
        <div className="w-full lg:w-[60%] flex flex-col border-b lg:border-b-0 lg:border-r border-border/30 flex-shrink-0 lg:flex-shrink bg-black/30">
          {/* Player area */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6 min-h-[300px] lg:min-h-0">
            <div className="relative w-full max-w-[340px]">
              {/* 9:16 phone mockup on desktop, plain on mobile */}
              <div className="hidden lg:block">
                <div className="relative" style={{ width: "100%", maxWidth: "280px", margin: "0 auto" }}>
                  {/* Phone frame */}
                  <div className="absolute inset-0 rounded-[2.5rem] border-4 border-border/40 pointer-events-none z-10"
                    style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />
                  <div className="relative aspect-[9/16] rounded-[2.2rem] overflow-hidden bg-black">
                    {signedUrl ? (
                      <video
                        ref={videoRef}
                        src={signedUrl}
                        className="w-full h-full object-cover"
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => { setPlaying(false); if (playAllIndex === null) setActiveClipId(null); }}
                        onPause={() => setPlaying(false)}
                        onPlay={() => setPlaying(true)}
                        playsInline
                        preload="auto"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                      </div>
                    )}
                    {/* Play/pause overlay */}
                    {!playing && signedUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
                        <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: 16:9 player */}
              <div className="block lg:hidden w-full">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  {signedUrl ? (
                    <video
                      ref={videoRef}
                      src={signedUrl}
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => { setPlaying(false); if (playAllIndex === null) setActiveClipId(null); }}
                      onPause={() => setPlaying(false)}
                      onPlay={() => setPlaying(true)}
                      playsInline
                      preload="auto"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                    </div>
                  )}
                  {!playing && signedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
                      <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player controls */}
          <div className="shrink-0 px-4 pb-4 lg:px-6 lg:pb-6 space-y-3">
            {/* Play All indicator */}
            {playAllIndex !== null && playAllClipTitle && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                <PlayCircle className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                <span className="text-primary/80">
                  {t("highlightReel.playingClip", { current: playAllClipNumber, total: selectedClips.length, title: playAllClipTitle })}
                </span>
              </div>
            )}

            {/* Transport buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="flex-none h-9 w-9 p-0"
                disabled={!signedUrl}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="hero-outline"
                size="sm"
                onClick={handlePlayAll}
                disabled={selectedClips.length === 0 || !signedUrl}
                className="h-9 text-xs"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                {t("highlightReel.playAll")}
              </Button>
              {/* Refresh */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { const el = videoRef.current; if (el) { setPlaying(false); el.pause(); el.load(); } }}
                className="flex-none h-9 w-9 p-0 text-muted-foreground"
                disabled={!signedUrl}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                {formatTimestamp(currentTime)}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Editor panel (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Title + AI badge */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {t("highlightReel.reelTitle")}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-card/40 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="My Highlight Reel"
                />
              </div>

              {/* AI Recommended banner */}
              {!isEditing && aiRecommendedIds.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-primary/80">✨ {t("highlightReel.aiRecommended")} — top {aiRecommendedIds.length} clips pre-selected</span>
                </div>
              )}

              {/* Selected clips list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("highlightReel.selected")} ({selectedIds.length}/10)
                  </label>
                  {totalDuration > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {selectedClips.length} clips · {formatDur(totalDuration)}
                    </span>
                  )}
                </div>

                {selectedIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 rounded-xl border border-dashed border-border/30 text-muted-foreground/40">
                    <Film className="w-7 h-7 mb-1.5" />
                    <p className="text-xs">{t("highlightReel.addClipsFromLeft")}</p>
                    <p className="text-[10px] mt-0.5">Min 2, max 10</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {selectedClips.map((clip, i) => (
                          <SortableClipItem
                            key={clip.id}
                            clip={clip}
                            index={i}
                            onRemove={removeFromSelected}
                            isAiRecommended={!isEditing && aiRecommendedIds.includes(clip.id)}
                            timing={timingOverrides[clip.id] || { startTime: parseTime(clip.start_time), endTime: parseTime(clip.end_time) }}
                            onAdjustStart={adjustStart}
                            onAdjustEnd={adjustEnd}
                            onPreview={handlePreviewClip}
                            isActive={activeClipId === clip.id}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Add Clips button / panel */}
              <div>
                <Button
                  variant="hero-outline"
                  size="sm"
                  onClick={() => setShowAddPanel((v) => !v)}
                  disabled={selectedIds.length >= 10}
                  className="w-full h-9 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {t("highlightReel.addClips")} ({availableClips.length} available)
                </Button>

                {showAddPanel && availableClips.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border border-border/40 p-2 bg-card/30">
                    {availableClips.map((clip) => (
                      <button
                        key={clip.id}
                        onClick={() => addClip(clip.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg border border-border/20 bg-card/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="w-7 h-12 rounded-md overflow-hidden shrink-0">
                          <ClipVideoThumbnail
                            renderedUrl={clip.status === "ready" && clip.file_path ? clip.file_path : null}
                            filePath={null}
                            startTime={clip.start_time}
                            fallbackImageUrl={clip.thumbnail_url || undefined}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{clip.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {clip.duration_seconds && <span className="text-[10px] text-muted-foreground">{clip.duration_seconds}s</span>}
                            {clip.viral_score != null && <span className="text-[10px] text-accent">⚡{clip.viral_score}</span>}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {showAddPanel && availableClips.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground/50 mt-2 py-4">All clips are already selected</p>
                )}
              </div>

              {/* Caption style */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  {t("videoConfig.captionStyle")}
                </label>
                <div className="flex gap-2">
                  {CAPTION_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => setCaptionStyle(style)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all capitalize ${
                        captionStyle === style
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/30 bg-card/20 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transitions toggle */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  {t("highlightReel.transitions")}
                </label>
                <button
                  onClick={() => setAddTransitions(!addTransitions)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    addTransitions
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border/30 bg-card/20 text-muted-foreground"
                  }`}
                >
                  <span>{addTransitions ? `✓ ${t("highlightReel.crossfade")} (0.5s)` : "No transitions"}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${addTransitions ? "bg-accent" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${addTransitions ? "left-4" : "left-0.5"}`} />
                  </div>
                </button>
              </div>

              {/* Summary */}
              <div className="text-xs text-muted-foreground pb-2">
                {selectedIds.length < 2
                  ? `Select at least ${2 - selectedIds.length} more clip${2 - selectedIds.length !== 1 ? "s" : ""}`
                  : `${selectedIds.length} clips · ${formatDur(totalDuration)} total`}
              </div>
            </div>
          </div>

          {/* Sticky footer CTA */}
          <div className="shrink-0 p-4 border-t border-border/40" style={{ background: "hsl(240,15%,9%)" }}>
            <Button
              variant="hero"
              className="w-full"
              onClick={handleSubmit}
              disabled={selectedIds.length < 2 || saving}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditing ? "Saving..." : "Creating..."}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />
                  {isEditing ? t("highlightReel.saveAndRender") : t("highlightReel.createReel")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

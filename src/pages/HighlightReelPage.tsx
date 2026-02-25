import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, GripVertical, Sparkles, Clock, Loader2, Film, Zap,
  ChevronLeft, ChevronRight, Play, Pause, RefreshCw, Plus, X,
  ChevronRight as BreadcrumbChevron, PlayCircle, Volume2, VolumeX,
  MousePointerClick, User, Monitor, Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { posthog } from "@/lib/posthog";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import RenderCreditDialog from "@/components/dashboard/RenderCreditDialog";
import { useCredits } from "@/hooks/useCredits";
import LiveSubtitles from "@/components/LiveSubtitles";
import type { CaptionStyle } from "@/components/LiveSubtitles";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ─── */
interface ClipTiming { startTime: number; endTime: number; }

type PlayerMode =
  | { type: "idle" }
  | { type: "source"; clipId: string | null }     // source video, optionally bound to a clip
  | { type: "rendered"; clipId: string; url: string }; // rendered clip video

type CaptionStyleId = "hormozi" | "mrbeast" | "minimal" | "neon" | "fire" | "elegant" | "custom";

const CAPTION_STYLES: { id: CaptionStyleId; label: string; preview: string; color: string }[] = [
  { id: "hormozi", label: "Hormozi", preview: "Bold yellow, word highlight", color: "#FFD600" },
  { id: "mrbeast", label: "MrBeast", preview: "White + red pop, large", color: "#FF3333" },
  { id: "minimal", label: "Minimal", preview: "Clean white, lower-third", color: "#FFFFFF" },
  { id: "neon", label: "Neon", preview: "Electric green glow", color: "#00FF00" },
  { id: "fire", label: "Fire", preview: "Orange-red gradient feel", color: "#FF4500" },
  { id: "elegant", label: "Elegant", preview: "Soft white, thin outline", color: "#F0F0F0" },
];

const CUSTOM_COLORS = ["FF0000", "00BFFF", "FFD600", "FF6B00", "A855F7", "22C55E"];

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
  clip, index, onRemove, isAiRecommended, timing, onAdjustStart, onAdjustEnd,
  onClickPreview, isActive, isPlaying,
}: {
  clip: Tables<"clips">;
  index: number;
  onRemove: (id: string) => void;
  isAiRecommended?: boolean;
  timing: ClipTiming;
  onAdjustStart: (id: string, delta: number) => void;
  onAdjustEnd: (id: string, delta: number) => void;
  onClickPreview: (clip: Tables<"clips">) => void;
  isActive?: boolean;
  isPlaying?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const duration = Math.max(0, timing.endTime - timing.startTime);
  const isRendered = clip.status === "ready" && !!clip.file_path;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: isActive ? "hsl(var(--primary))" : undefined,
        borderLeftWidth: isActive ? "4px" : undefined,
      }}
      className={`rounded-xl border transition-all overflow-hidden ${
        isActive
          ? "border-primary/70 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] bg-primary/5"
          : isDragging
          ? "border-primary/50 bg-primary/10"
          : "border-border/40 bg-card/40 hover:border-border/60 hover:bg-card/60"
      }`}
    >
      {/* Clickable preview area (thumbnail + info) */}
      <div
        className="flex items-start gap-2 p-3 cursor-pointer select-none group/card"
        onClick={() => onClickPreview(clip)}
        title="Click to preview this clip"
      >
        {/* Drag handle — stops propagation so it doesn't trigger preview */}
        <div
          {...attributes}
          {...listeners}
          className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none mt-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Index */}
        <span className={`text-xs font-mono w-4 shrink-0 mt-1 ${isActive ? "text-primary font-bold" : "text-muted-foreground/50"}`}>
          {index + 1}
        </span>

        {/* Thumbnail — 9:16 for rendered, 16:9 feel for source */}
        <div className={`relative rounded-md overflow-hidden shrink-0 ${isRendered ? "w-8 h-14" : "w-12 h-8 mt-1"}`}>
          <ClipVideoThumbnail
            renderedUrl={isRendered ? clip.file_path! : null}
            filePath={null}
            startTime={clip.start_time}
            fallbackImageUrl={clip.thumbnail_url || undefined}
            alt={clip.title}
            className="w-full h-full object-cover"
          />
          {/* Animated equalizer overlay when playing */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center pb-1 bg-black/50">
              <div className="flex items-end gap-[2px]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-1 rounded-sm"
                    style={{
                      background: "hsl(var(--primary))",
                      height: `${6 + i * 3}px`,
                      animation: `equalizerBar${i} 0.6s ease-in-out infinite alternate`,
                      animationDelay: `${(i - 1) * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Hover play hint when not active */}
          {!isActive && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/card:bg-black/40 transition-colors">
              <Play className="w-3 h-3 text-white opacity-0 group-hover/card:opacity-100 transition-opacity ml-0.5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate mb-0.5 ${isActive ? "text-primary" : "text-foreground"}`}>
            {clip.title}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isActive && isPlaying ? (
              /* Now Playing pill */
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "hsl(var(--primary)/0.2)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.4)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Now Playing
              </span>
            ) : isActive ? (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary)/0.8)", border: "1px solid hsl(var(--primary)/0.25)" }}
              >
                Previewing
              </span>
            ) : null}
            {isAiRecommended && !isActive && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                <Zap className="w-2 h-2" /> AI
              </span>
            )}
            {clip.viral_score != null && (
              <span className="text-[9px] text-accent">⚡{clip.viral_score}</span>
            )}
            {!isActive && (isRendered ? (
              <span className="text-[9px] px-1 rounded" style={{ background: "hsl(var(--accent)/0.15)", color: "hsl(var(--accent))" }}>
                ✓ rendered
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground/50">source</span>
            ))}
          </div>
        </div>

        {/* Remove — stops propagation */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(clip.id); }}
          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-1 p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timing controls (below the clickable row) */}
      <div className="px-3 pb-3 space-y-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground/60 w-7 shrink-0">Start</span>
          <button onClick={() => onAdjustStart(clip.id, -1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.startTime)}</span>
          <button onClick={() => onAdjustStart(clip.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="mx-1 text-muted-foreground/30 text-[9px]">→</span>
          <button onClick={() => onAdjustEnd(clip.id, -1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.endTime)}</span>
          <button onClick={() => onAdjustEnd(clip.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-muted-foreground/40 ml-1">{duration.toFixed(0)}s</span>
        </div>
      </div>
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
  const [loadingData, setLoadingData] = useState(true);

  /* Video player state */
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const renderedVideoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [signedSourceUrl, setSignedSourceUrl] = useState<string | null>(null);
  const [renderedClipUrl, setRenderedClipUrl] = useState<string | null>(null);
  const [renderedReelUrl, setRenderedReelUrl] = useState<string | null>(null);

  // playerMode drives which video element is shown and in what container
  const [playerMode, setPlayerMode] = useState<PlayerMode>({ type: "idle" });

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [renderedDuration, setRenderedDuration] = useState(0);
  const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);

  // Play-all state (always uses source video with seeking)
  const [playAllIndex, setPlayAllIndex] = useState<number | null>(null);

  // Banner for "not rendered yet" clips
  const [showSourceBanner, setShowSourceBanner] = useState(false);

  /* Editor state */
  const [title, setTitle] = useState("My Highlight Reel");
  const [captionStyle, setCaptionStyle] = useState<string>("hormozi");
  const [customColor, setCustomColor] = useState("");
  const [addTransitions, setAddTransitions] = useState(true);
  const [reframeMode, setReframeMode] = useState<string>("smart");
  const [subtitleSize, setSubtitleSize] = useState<string>("medium");
  const [subtitleY, setSubtitleY] = useState(0.85);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [timingOverrides, setTimingOverrides] = useState<Record<string, ClipTiming>>({});
  const [saving, setSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [showRenderedReel, setShowRenderedReel] = useState(false);
  const { credits, refetch: refetchCredits } = useCredits();

  /* Clip transcriptions for live subtitle overlay */
  const [clipTranscriptions, setClipTranscriptions] = useState<Record<string, { words: { word: string; start: number; end: number }[]; startTime: number; endTime: number }>>({});
  /* Derived: which clip is currently active in the player */
  const activeClipId = playerMode.type !== "idle" ? (
    playerMode.type === "rendered" ? playerMode.clipId : playerMode.clipId
  ) : null;

  /* ─── Load data ─── */
  useEffect(() => {
    async function load() {
      setLoadingData(true);
      try {
        let vid: Tables<"videos"> | null = null;

        if (isEditing && reelId) {
          const { data: r } = await supabase.from("highlight_reels" as any).select("*").eq("id", reelId).single();
          if (r) {
            const reel = r as any;
            const { data: v } = await supabase.from("videos").select("*").eq("id", reel.video_id).single();
            vid = v;
            setTitle(reel.title);
            setCaptionStyle(reel.caption_style || "hormozi");
            setAddTransitions(reel.add_transitions ?? true);
            setSelectedIds(reel.clip_ids || []);
            // If reel is ready, set rendered reel URL for preview
            if (reel.status === "ready" && reel.file_path) {
              setRenderedReelUrl(reel.file_path);
            }
          }
        } else if (videoId) {
          const { data: v } = await supabase.from("videos").select("*").eq("id", videoId).single();
          vid = v;
        }

        if (vid) {
          setVideo(vid);
          const { data: clipsData } = await supabase
            .from("clips")
            .select("*")
            .eq("video_id", vid.id)
            .order("viral_score", { ascending: false });

          const loadedClips = (clipsData || []) as Tables<"clips">[];
          setClips(loadedClips);

          const init: Record<string, ClipTiming> = {};
          loadedClips.forEach((c) => {
            init[c.id] = { startTime: parseTime(c.start_time), endTime: parseTime(c.end_time) };
          });
          setTimingOverrides(init);

          if (!isEditing) {
            const top3 = loadedClips.filter((c) => c.viral_score != null).slice(0, 3).map((c) => c.id);
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

  /* ─── Fetch transcription words for all selected clips ─── */
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const fetchTranscriptions = async () => {
      const { data } = await supabase
        .from("clips")
        .select("id, transcription_words, start_time, end_time")
        .in("id", selectedIds);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((clip: any) => {
          const words = clip.transcription_words as { word: string; start: number; end: number }[] | null;
          if (words && Array.isArray(words) && words.length > 0) {
            map[clip.id] = {
              words,
              startTime: parseTime(clip.start_time),
              endTime: parseTime(clip.end_time),
            };
          }
        });
        setClipTranscriptions(map);
      }
    };
    fetchTranscriptions();
  }, [selectedIds]);

  /* ─── Signed URL for source video ─── */
  useEffect(() => {
    if (!video?.file_path) return;
    supabase.storage
      .from("raw-videos")
      .createSignedUrl(video.file_path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setSignedSourceUrl(data.signedUrl); });
  }, [video?.file_path]);

  /* ─── Derived ─── */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require pointer to move 8px before activating drag — lets clicks fire normally
      activationConstraint: { distance: 8 },
    }),
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

  /* ─── Player helpers ─── */

  /** Flash the play/pause icon overlay */
  const flash = useCallback((icon: "play" | "pause") => {
    setFlashIcon(icon);
    setTimeout(() => setFlashIcon(null), 600);
  }, []);

  /** Get the currently active <video> element */
  const activeVideoEl = useCallback((): HTMLVideoElement | null => {
    if (playerMode.type === "rendered") return renderedVideoRef.current;
    return sourceVideoRef.current;
  }, [playerMode]);

  const togglePlay = useCallback(() => {
    const el = activeVideoEl();
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      flash("pause");
    } else {
      el.play().catch(() => {});
      setPlaying(true);
      flash("play");
    }
  }, [playing, activeVideoEl, flash]);

  /** Load a rendered clip into the rendered player */
  const loadRenderedClip = useCallback(async (clip: Tables<"clips">) => {
    if (!clip.file_path) return;
    // Get a signed URL for the rendered clip from rendered-clips bucket
    const { data } = await supabase.storage
      .from("rendered-clips")
      .createSignedUrl(clip.file_path, 3600);
    if (data?.signedUrl) {
      setRenderedClipUrl(data.signedUrl);
    }
  }, []);

  /** Preview a clip: rendered if available, else source with seeking */
  const handleClickClip = useCallback(async (clip: Tables<"clips">) => {
    const isRendered = clip.status === "ready" && !!clip.file_path;

    // Stop any current playback
    sourceVideoRef.current?.pause();
    renderedVideoRef.current?.pause();
    setPlaying(false);
    setPlayAllIndex(null);

    if (isRendered) {
      setShowSourceBanner(false);
      setPlayerMode({ type: "rendered", clipId: clip.id, url: "" }); // url filled async
      await loadRenderedClip(clip);
      // Auto-play after a tick (src needs to load)
      setTimeout(() => {
        const el = renderedVideoRef.current;
        if (el) { el.currentTime = 0; el.play().catch(() => {}); setPlaying(true); }
      }, 100);
    } else {
      // Use source video with seeking
      setShowSourceBanner(true);
      setPlayerMode({ type: "source", clipId: clip.id });
      const timing = timingOverrides[clip.id] || { startTime: parseTime(clip.start_time), endTime: parseTime(clip.end_time) };
      const el = sourceVideoRef.current;
      if (!el) return;
      el.currentTime = timing.startTime;
      const onSeeked = () => {
        el.removeEventListener("seeked", onSeeked);
        el.play().catch(() => {});
        setPlaying(true);
      };
      el.addEventListener("seeked", onSeeked);
    }
  }, [timingOverrides, loadRenderedClip]);

  /** Play All: uses source video with sequential seeking */
  const handlePlayAll = useCallback(() => {
    if (selectedClips.length === 0) return;
    setPlayAllIndex(0);
    const first = selectedClips[0];
    const timing = timingOverrides[first.id] || { startTime: parseTime(first.start_time), endTime: parseTime(first.end_time) };
    setShowSourceBanner(false);
    setPlayerMode({ type: "source", clipId: first.id });
    renderedVideoRef.current?.pause();
    const el = sourceVideoRef.current;
    if (!el) return;
    el.currentTime = timing.startTime;
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      el.play().catch(() => {});
      setPlaying(true);
    };
    el.addEventListener("seeked", onSeeked);
  }, [selectedClips, timingOverrides]);

  /** timeupdate for source video */
  const handleSourceTimeUpdate = useCallback(() => {
    const el = sourceVideoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);

    if (playAllIndex !== null) {
      const cur = selectedClips[playAllIndex];
      if (!cur) return;
      const timing = timingOverrides[cur.id] || { startTime: parseTime(cur.start_time), endTime: parseTime(cur.end_time) };
      if (el.currentTime >= timing.endTime - 0.1) {
        const next = playAllIndex + 1;
        if (next < selectedClips.length) {
          setPlayAllIndex(next);
          const nc = selectedClips[next];
          const nt = timingOverrides[nc.id] || { startTime: parseTime(nc.start_time), endTime: parseTime(nc.end_time) };
          setPlayerMode({ type: "source", clipId: nc.id });
          el.currentTime = nt.startTime;
        } else {
          el.pause();
          setPlaying(false);
          setPlayAllIndex(null);
          setPlayerMode({ type: "idle" });
        }
      }
    } else if (playerMode.type === "source" && playerMode.clipId) {
      const clip = clips.find((c) => c.id === playerMode.clipId);
      if (clip) {
        const timing = timingOverrides[playerMode.clipId] || { startTime: parseTime(clip.start_time), endTime: parseTime(clip.end_time) };
        if (el.currentTime >= timing.endTime - 0.05) {
          el.pause();
          setPlaying(false);
        }
      }
    }
  }, [playAllIndex, playerMode, selectedClips, clips, timingOverrides]);

  /** timeupdate for rendered clip video */
  const handleRenderedTimeUpdate = useCallback(() => {
    const el = renderedVideoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const isSource = playerMode.type !== "rendered";
    const el = isSource ? sourceVideoRef.current : renderedVideoRef.current;
    const duration = isSource ? sourceDuration : renderedDuration;
    if (!el || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  }, [playerMode, sourceDuration, renderedDuration]);

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
    if (activeClipId === id) setPlayerMode({ type: "idle" });
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

  /* ─── Submit (credit-gated) ─── */
  const handleSaveAndRender = () => {
    if (selectedIds.length < 2) { toast.error("Select at least 2 clips"); return; }
    setCreditDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 2) { toast.error("Select at least 2 clips"); return; }
    setSaving(true);
    setCreditDialogOpen(false);
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

      await apiFetch("/create-highlight-reel", {
        reel_id: reelRowId,
        video_storage_path: video!.file_path,
        clips: clipsPayload,
        caption_style: captionStyle,
        add_transitions: addTransitions,
        custom_color: captionStyle === "custom" ? customColor : undefined,
        reframe_mode: reframeMode,
        subtitle_size: subtitleSize,
        subtitle_y: subtitleY,
      });

      // Clear rendered reel preview since we're re-rendering
      setRenderedReelUrl(null);
      setShowRenderedReel(false);

      // Deduct 1 credit — only after successful API request
      await supabase.rpc("increment_used_credits" as any, { _user_id: user.id });
      refetchCredits();

      const reelMins = Math.round(totalDuration / 60 * 10) / 10;
      const reelEstimate = totalDuration < 60 ? "~2 minutes" : totalDuration < 120 ? "~2–3 minutes" : "~3–5 minutes";
      toast.success(`Creating highlight reel (${reelEstimate} for ${reelMins < 1 ? Math.round(totalDuration) + "s" : reelMins.toFixed(1) + "m"} total)...`);
      posthog.capture('highlight_reel_created', { clip_count: selectedIds.length });
      navigate(`/dashboard/videos/${videoIdForReel}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save highlight reel");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Derived display values ─── */
  const showRenderedPlayer = playerMode.type === "rendered";
  const showSourcePlayer = playerMode.type !== "rendered";
  const currentDuration = showRenderedPlayer ? renderedDuration : sourceDuration;

  // Active clip object
  const activeClip = activeClipId ? clips.find((c) => c.id === activeClipId) : null;
  const activeClipIndex = activeClipId ? selectedIds.indexOf(activeClipId) : -1;

  // Crop simulation based on reframe mode
  const activeClipFaceX = activeClip
    ? ((activeClip.viral_analysis as Record<string, unknown> | null)?.face_x as number ?? 0.5)
    : 0.5;
  const videoObjectFit = reframeMode === "full" ? "object-contain" : "object-cover";
  const videoObjectPosition = reframeMode === "full"
    ? "50% center"
    : reframeMode === "smart"
      ? `${activeClipFaceX * 100}% center`
      : "50% center";

  // Subtitle size classes
  const subtitleSizeClass = subtitleSize === "small" ? "text-sm" : subtitleSize === "large" ? "text-2xl" : "text-lg";

  // Now-playing label
  const nowPlayingLabel = activeClip
    ? `Clip ${activeClipIndex + 1} of ${selectedClips.length} — ${activeClip.title}`
    : playAllIndex !== null
    ? `Playing ${selectedClips.length} clips`
    : null;

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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/videos/${video.id}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("upload.cancel")}</span>
          </Button>
          <Button variant="hero" size="sm" onClick={handleSaveAndRender} disabled={selectedIds.length < 2 || saving} className="min-w-[140px]">
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

        {/* LEFT: Smart video player (60%) */}
        <div className="w-full lg:w-[60%] flex flex-col border-b lg:border-b-0 lg:border-r border-border/30 bg-black">

          {/* Now-playing banner */}
          {nowPlayingLabel && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/20"
              style={{ background: "hsl(var(--primary)/0.08)" }}>
              <PlayCircle className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
              <span className="text-xs text-primary/80 truncate">{nowPlayingLabel}</span>
              {showSourceBanner && (
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  Preview — render for final quality
                </span>
              )}
            </div>
          )}

          {/* Player area */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6 min-h-[260px] lg:min-h-0 relative">

            {/* ── RENDERED REEL PLAYER (9:16 vertical) — shown when user toggles to it ── */}
            {renderedReelUrl && showRenderedReel && playerMode.type === "idle" ? (
              <div className="relative flex items-center justify-center h-full w-full">
                <div
                  className="relative rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    maxHeight: "65vh",
                    aspectRatio: "9/16",
                    background: "#000",
                    boxShadow: "0 0 60px -15px hsl(var(--primary)/0.3)",
                  }}
                >
                  <video
                    src={renderedReelUrl}
                    className="w-full h-full object-contain cursor-pointer"
                    style={{ background: "#000" }}
                    controls
                    playsInline
                    preload="auto"
                  />
                  <div className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "hsl(var(--accent)/0.85)", color: "hsl(var(--accent-foreground))" }}>
                    ✓ Rendered Reel
                  </div>
                </div>
                <p className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[10px] text-green-400 text-center whitespace-nowrap">
                  Showing final rendered version with embedded subtitles
                </p>
                <button
                  onClick={() => setShowRenderedReel(false)}
                  className="absolute bottom-4 right-4 text-[10px] text-muted-foreground hover:text-foreground bg-black/50 px-2.5 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1"
                >
                  <span>✏️</span> Back to editor
                </button>
              </div>
            ) : null}

            {/* ── RENDERED CLIP PLAYER (9:16 vertical) ── */}
            {!(renderedReelUrl && showRenderedReel) || playerMode.type !== "idle" ? (<>{showRenderedPlayer && renderedClipUrl ? (
              <div className="relative flex items-center justify-center h-full w-full">
                <div
                  className="relative rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    maxHeight: "65vh",
                    aspectRatio: "9/16",
                    background: "#000",
                    boxShadow: "0 0 60px -15px hsl(var(--primary)/0.3)",
                  }}
                >
                  <video
                    ref={renderedVideoRef}
                    src={renderedClipUrl}
                    className="w-full h-full object-contain cursor-pointer"
                    style={{ background: "#000" }}
                    onTimeUpdate={handleRenderedTimeUpdate}
                    onLoadedMetadata={() => {
                      const el = renderedVideoRef.current;
                      if (el) setRenderedDuration(el.duration || 0);
                    }}
                    onEnded={() => { setPlaying(false); }}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                    onClick={togglePlay}
                    muted={muted}
                    playsInline
                    preload="auto"
                  />

                  {/* Flash icon */}
                  {flashIcon && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center"
                        style={{ animation: "flash-fade 0.6s ease-out forwards" }}>
                        {flashIcon === "play" ? <Play className="w-7 h-7 text-white ml-0.5" /> : <Pause className="w-7 h-7 text-white" />}
                      </div>
                    </div>
                  )}

                  {/* Paused overlay */}
                  {!playing && !flashIcon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer" onClick={togglePlay}>
                      <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* "Rendered with subtitles" badge */}
                  <div className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "hsl(var(--accent)/0.85)", color: "hsl(var(--accent-foreground))" }}>
                    ✓ Final Quality
                  </div>
                </div>
              </div>
            ) : showRenderedPlayer && !renderedClipUrl ? (
              /* Loading rendered clip */
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                <p className="text-xs text-muted-foreground/50">Loading rendered clip...</p>
              </div>
            ) : null}

            {/* ── SOURCE VIDEO PLAYER (16:9 horizontal or idle) ── */}
            <div className={`w-full transition-all duration-300 ${showRenderedPlayer ? "hidden" : "block"}`}>
              <div className="relative w-full rounded-lg overflow-hidden bg-black border border-white/10">

                {/* Empty state overlay */}
                {playerMode.type === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                    <div className="flex flex-col items-center gap-3 text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <MousePointerClick className="w-6 h-6 text-primary/60" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/70">Click a clip to preview</p>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Live preview — change caption style to see updates instantly
                      </p>
                      {renderedReelUrl && (
                        <button
                          onClick={() => setShowRenderedReel(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 pointer-events-auto"
                        >
                          <span>👁</span> Preview final render
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!signedSourceUrl && (
                  <div className="w-full flex items-center justify-center bg-black" style={{ aspectRatio: "16/9" }}>
                    <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                  </div>
                )}

                {signedSourceUrl && (
                  <video
                    ref={sourceVideoRef}
                    src={signedSourceUrl}
                    className={`w-full block cursor-pointer ${videoObjectFit}`}
                    style={{
                      maxHeight: "65vh",
                      background: "#000",
                      objectPosition: videoObjectPosition,
                    }}
                    onTimeUpdate={handleSourceTimeUpdate}
                    onLoadedMetadata={() => {
                      const el = sourceVideoRef.current;
                      if (el) setSourceDuration(el.duration || 0);
                    }}
                    onEnded={() => { setPlaying(false); if (playAllIndex === null) setPlayerMode({ type: "idle" }); }}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                    onClick={playerMode.type === "idle" ? undefined : togglePlay}
                    muted={muted}
                    playsInline
                    preload="auto"
                  />
                )}

                {/* Live subtitle overlay on source video */}
                {(() => {
                  const clipId = playerMode.type === "source" ? playerMode.clipId : null;
                  if (!clipId) return null;
                  const trans = clipTranscriptions[clipId];
                  if (!trans || trans.words.length === 0) return null;
                  const timing = timingOverrides[clipId] || { startTime: trans.startTime, endTime: trans.endTime };
                  const relTime = currentTime - timing.startTime;
                  return (
                    <div
                      className={`absolute left-0 right-0 pointer-events-none z-20 ${subtitleSizeClass}`}
                      style={{ top: `${subtitleY * 100}%`, transform: "translateY(-50%)" }}
                    >
                      <div className="relative">
                        <LiveSubtitles
                          words={trans.words}
                          relativeTime={relTime}
                          captionStyle={captionStyle as CaptionStyle}
                          customColor={customColor}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Flash icon overlay */}
                {flashIcon && !showRenderedPlayer && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center"
                      style={{ animation: "flash-fade 0.6s ease-out forwards" }}>
                      {flashIcon === "play" ? <Play className="w-8 h-8 text-white ml-1" /> : <Pause className="w-8 h-8 text-white" />}
                    </div>
                  </div>
                )}

                {/* Paused overlay (only when a clip is selected in source mode) */}
                {!playing && signedSourceUrl && !flashIcon && playerMode.type === "source" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
                    <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>) : null}
          </div>

          {/* Controls bar */}
          <div className="shrink-0 px-4 pb-4 lg:px-6 lg:pb-5 space-y-2.5">

            {/* Progress bar */}
            <div
              ref={progressRef}
              className="relative h-7 flex items-center cursor-pointer group select-none"
              onClick={handleProgressClick}
            >
              {/* Track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10" />

              {/* Clip segment highlights — only for source video */}
              {!showRenderedPlayer && sourceDuration > 0 && selectedClips.map((clip) => {
                const seg = timingOverrides[clip.id] || { startTime: parseTime(clip.start_time), endTime: parseTime(clip.end_time) };
                const left = (seg.startTime / sourceDuration) * 100;
                const width = Math.max(0.5, ((seg.endTime - seg.startTime) / sourceDuration) * 100);
                const isNowPlaying = activeClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-sm transition-colors"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: isNowPlaying ? "hsl(349,100%,65%)" : "hsl(349,100%,59%,0.55)",
                      boxShadow: isNowPlaying ? "0 0 8px hsl(349,100%,59%)" : undefined,
                    }}
                  />
                );
              })}

              {/* Simple progress for rendered clip */}
              {showRenderedPlayer && renderedDuration > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
                  style={{ width: `${(currentTime / renderedDuration) * 100}%`, background: "hsl(349,100%,59%)" }}
                />
              )}

              {/* Elapsed (source) */}
              {!showRenderedPlayer && sourceDuration > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/20 pointer-events-none"
                  style={{ width: `${(currentTime / sourceDuration) * 100}%` }}
                />
              )}

              {/* Playhead */}
              {currentDuration > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none -ml-1.5 group-hover:scale-125 transition-transform"
                  style={{ left: `${(currentTime / currentDuration) * 100}%` }}
                />
              )}
            </div>

            {/* Transport row */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                disabled={playerMode.type === "idle"}
                className="flex-none w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
              >
                {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>

              <button
                onClick={() => setMuted((m) => !m)}
                className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="text-xs text-muted-foreground font-mono">
                {formatTimestamp(currentTime)} / {formatTimestamp(currentDuration)}
              </span>

              <Button
                variant="hero-outline"
                size="sm"
                onClick={handlePlayAll}
                disabled={selectedClips.length === 0 || !signedSourceUrl}
                className="ml-auto h-8 text-xs px-3"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                {t("highlightReel.playAll")}
              </Button>

              {showRenderedPlayer && (
                <button
                  onClick={() => {
                    setPlayerMode({ type: "idle" });
                    setPlaying(false);
                    renderedVideoRef.current?.pause();
                  }}
                  className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
                  title="Back to source view"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Editor panel (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Title */}
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
                            onClickPreview={handleClickClip}
                            isActive={activeClipId === clip.id}
                            isPlaying={activeClipId === clip.id && playing}
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
                            {clip.status === "ready" && (
                              <span className="text-[9px]" style={{ color: "hsl(var(--accent))" }}>✓ rendered</span>
                            )}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {showAddPanel && availableClips.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground/50 mt-2 py-4">All clips are already selected</p>
                )}
              </div>

              {/* Reframe Mode */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Format</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "smart", icon: <User className="w-4 h-4" />, label: "Smart", desc: "AI face tracking" },
                    { value: "full", icon: <Monitor className="w-4 h-4" />, label: "Full Frame", desc: "Letterbox with bars" },
                    { value: "center", icon: <Crosshair className="w-4 h-4" />, label: "Center", desc: "Crop middle" },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setReframeMode(mode.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                        reframeMode === mode.value
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      {mode.icon}
                      <span className="text-[11px] font-medium">{mode.label}</span>
                      <span className="text-[9px] text-muted-foreground">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption style */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  {t("videoConfig.captionStyle")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CAPTION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setCaptionStyle(style.id)}
                      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                        captionStyle === style.id
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/30 bg-card/20 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: style.color }} />
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
                {/* Custom color */}
                <div className="mt-2">
                  <button
                    onClick={() => setCaptionStyle("custom")}
                    className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      captionStyle === "custom"
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border/30 bg-card/20 text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    🎨 Custom Color
                  </button>
                  {captionStyle === "custom" && (
                    <div className="flex gap-2 mt-2 px-1">
                      {CUSTOM_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCustomColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            customColor === c ? "border-white scale-110" : "border-transparent"
                          }`}
                          style={{ background: `#${c}` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Layout */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption Layout</h3>
                  <span className="text-[10px] text-muted-foreground">Applied on render</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "small", label: "S" },
                      { value: "medium", label: "M" },
                      { value: "large", label: "L" },
                    ].map((size) => (
                      <button
                        key={size.value}
                        onClick={() => setSubtitleSize(size.value)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          subtitleSize === size.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Position</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">Top</span>
                    <input
                      type="range"
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      value={subtitleY}
                      onChange={(e) => setSubtitleY(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-[10px] text-muted-foreground">Bottom</span>
                  </div>
                </div>
              </div>

              {/* Subtitle note */}
              <p className="text-[10px] text-muted-foreground/60 px-1">
                💬 Subtitle text is auto-generated. Change caption style above — preview updates live on the video.
              </p>

              {/* Per-clip subtitle words */}
              {activeClipId && clipTranscriptions[activeClipId] && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Subtitles — Clip {activeClipIndex + 1}: {activeClip?.title}
                  </h3>
                  <div className="flex flex-wrap gap-1 p-3 rounded-lg border border-border/50 bg-card/30 max-h-40 overflow-y-auto">
                    {clipTranscriptions[activeClipId].words.map((word: any, i: number) => {
                      const timing = timingOverrides[activeClipId] || { startTime: clipTranscriptions[activeClipId].startTime, endTime: clipTranscriptions[activeClipId].endTime };
                      const relTime = currentTime - timing.startTime;
                      const isWordActive = relTime >= word.start && relTime < word.end + 0.08;
                      return (
                        <span
                          key={i}
                          className={`text-xs px-1 py-0.5 rounded cursor-pointer transition-colors ${
                            isWordActive
                              ? "bg-primary/30 text-foreground font-medium"
                              : "text-muted-foreground hover:bg-card"
                          }`}
                          onClick={() => {
                            const el = sourceVideoRef.current;
                            if (el) {
                              el.currentTime = timing.startTime + word.start;
                              setCurrentTime(timing.startTime + word.start);
                            }
                          }}
                        >
                          {word.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

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
              onClick={handleSaveAndRender}
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
      <RenderCreditDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        onConfirm={handleSubmit}
        creditsRequired={1}
        creditsRemaining={credits?.remaining ?? 0}
        loading={saving}
      />
    </div>
  );
}

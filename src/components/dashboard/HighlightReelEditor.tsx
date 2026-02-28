import { useState, useMemo, useCallback, useEffect } from "react";
import { X, GripVertical, Sparkles, Clock, Loader2, Plus, Minus, Film, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Tables } from "@/integrations/supabase/types";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
import SubtitleStylePicker from "@/components/SubtitleStylePicker";
import { type SubtitleStyle, getDefaultStyle, getPresetById, loadAllPresetFonts } from "@/config/subtitlePresets";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HighlightReelEditorProps {
  video: Tables<"videos">;
  clips: Tables<"clips">[];
  onClose: () => void;
  initialSelectedIds?: string[];
  editingReel?: {
    id: string;
    title: string;
    clip_ids: string[];
    clip_order: number[];
    caption_style: string;
    add_transitions: boolean;
  } | null;
}

/* Old caption style types removed — now using SubtitleStyle from subtitlePresets */

// Clip timing override type
interface ClipTiming {
  startTime: number;
  endTime: number;
}

function parseTime(s: string | null | undefined): number {
  return parseFloat(s || "0") || 0;
}

function formatTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function SortableClipItem({
  clip,
  index,
  onRemove,
  isAiRecommended,
  timing,
  onAdjustStart,
  onAdjustEnd,
}: {
  clip: Tables<"clips">;
  index: number;
  onRemove: (id: string) => void;
  isAiRecommended?: boolean;
  timing: ClipTiming;
  onAdjustStart: (id: string, delta: number) => void;
  onAdjustEnd: (id: string, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const duration = Math.max(0, timing.endTime - timing.startTime);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-3 rounded-xl border transition-colors ${
        isDragging ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/40"
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
      <span className="text-xs font-mono text-muted-foreground/50 w-4 shrink-0 mt-1">{index + 1}</span>

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
          {/* Start time */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/60 w-7 shrink-0">Start</span>
            <button
              onClick={() => onAdjustStart(clip.id, -1)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.startTime)}</span>
            <button
              onClick={() => onAdjustStart(clip.id, 1)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {/* End time */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/60 w-7 shrink-0">End</span>
            <button
              onClick={() => onAdjustEnd(clip.id, -1)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-foreground min-w-[36px] text-center">{formatTimestamp(timing.endTime)}</span>
            <button
              onClick={() => onAdjustEnd(clip.id, 1)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground/50">{duration.toFixed(0)}s</p>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(clip.id)}
        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-1"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function HighlightReelEditor({ video, clips, onClose, initialSelectedIds, editingReel }: HighlightReelEditorProps) {
  const { t } = useTranslation();
  const isEditing = !!editingReel;

  const [title, setTitle] = useState(editingReel?.title || `Best of ${video.title}`);

  // Auto-select top 3 by viral score if no initialSelectedIds provided
  const defaultSelected = useMemo(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) return initialSelectedIds;
    return [...clips]
      .filter((c) => c.viral_score != null)
      .sort((a, b) => (b.viral_score ?? 0) - (a.viral_score ?? 0))
      .slice(0, 3)
      .map((c) => c.id);
  }, [clips, initialSelectedIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);
  const aiRecommendedIds = useMemo(() => (isEditing ? [] : defaultSelected), [defaultSelected, isEditing]);

  const initStyle = useMemo(() => {
    if (editingReel?.caption_style) {
      const preset = getPresetById(editingReel.caption_style);
      if (preset) {
        const { name, description, tags, ...style } = preset;
        return style;
      }
    }
    return getDefaultStyle();
  }, [editingReel]);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(initStyle);
  const [subtitleSize, setSubtitleSize] = useState<"small" | "medium" | "large">("medium");
  const [addTransitions, setAddTransitions] = useState(editingReel?.add_transitions ?? true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAllPresetFonts(); }, []);

  // Per-clip timing overrides: clipId -> { startTime, endTime }
  const [timingOverrides, setTimingOverrides] = useState<Record<string, ClipTiming>>(() => {
    const init: Record<string, ClipTiming> = {};
    clips.forEach((c) => {
      init[c.id] = { startTime: parseTime(c.start_time), endTime: parseTime(c.end_time) };
    });
    return init;
  });

  const adjustStart = useCallback((id: string, delta: number) => {
    setTimingOverrides((prev) => {
      const t = prev[id];
      const newStart = Math.max(0, t.startTime + delta);
      if (newStart >= t.endTime - 1) return prev; // keep at least 1s
      return { ...prev, [id]: { ...t, startTime: newStart } };
    });
  }, []);

  const adjustEnd = useCallback((id: string, delta: number) => {
    setTimingOverrides((prev) => {
      const t = prev[id];
      const clipEndMax = parseTime(clips.find((c) => c.id === id)?.end_time) + 30; // generous upper bound
      const newEnd = Math.min(clipEndMax, t.endTime + delta);
      if (newEnd <= t.startTime + 1) return prev;
      return { ...prev, [id]: { ...t, endTime: newEnd } };
    });
  }, [clips]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedClips = useMemo(
    () => selectedIds.map((id) => clips.find((c) => c.id === id)!).filter(Boolean),
    [selectedIds, clips]
  );

  const totalDuration = useMemo(
    () => selectedClips.reduce((sum, c) => {
      const t = timingOverrides[c.id];
      return sum + (t ? Math.max(0, t.endTime - t.startTime) : (c.duration_seconds || 0));
    }, 0),
    [selectedClips, timingOverrides]
  );

  const availableClips = useMemo(
    () => clips.filter((c) => !selectedIds.includes(c.id)),
    [clips, selectedIds]
  );

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else if (selectedIds.length < 10) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      toast.warning(t("highlightReel.max10Clips"));
    }
  };

  const removeFromSelected = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
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

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 2) {
      toast.error(t("highlightReel.selectAtLeast2"));
      return;
    }
    setCreating(true);
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

      let reelId: string;

      if (isEditing && editingReel) {
        // Update existing reel
        const { error } = await supabase
          .from("highlight_reels" as any)
          .update({
            title,
            clip_ids: selectedIds,
            clip_order: selectedIds.map((_, i) => i),
            caption_style: subtitleStyle.presetId,
            add_transitions: addTransitions,
            status: "pending",
            file_path: null,
            rendered_at: null,
          })
          .eq("id", editingReel.id);
        if (error) throw error;
        reelId = editingReel.id;
        toast.success(t("highlightReel.reelUpdated"));
      } else {
        // Create new reel
        const { data: reel, error } = await supabase
          .from("highlight_reels" as any)
          .insert({
            user_id: user.id,
            video_id: video.id,
            title,
            clip_ids: selectedIds,
            clip_order: selectedIds.map((_, i) => i),
            caption_style: subtitleStyle.presetId,
            add_transitions: addTransitions,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;
        reelId = (reel as any).id;
        toast.success(t("highlightReel.reelCreated"));
      }

      // Fire-and-forget to Modal worker
      apiFetch("/create-highlight-reel", {
        reel_id: reelId,
        video_storage_path: video.file_path,
        clips: clipsPayload,
        caption_style: subtitleStyle.presetId,
        add_transitions: addTransitions,
        subtitle_style: subtitleStyle,
      }).catch(() => {});

      onClose();
    } catch (err: any) {
      toast.error(err.message || t("highlightReel.failedToSave"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-border/50 overflow-hidden" style={{ background: "hsl(240,15%,9%)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Film className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? t("highlightReel.editReel") : t("highlightReel.editor")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("highlightReel.combineClips")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-6 pt-5 pb-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("highlightReel.reelTitle")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/40 bg-card/40 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              placeholder="My Highlight Reel"
            />
          </div>

          {/* AI Recommended banner (only when not editing) */}
          {!isEditing && aiRecommendedIds.length > 0 && (
            <div className="mx-6 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)" }}>
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-primary/80">
                ✨ {t("highlightReel.aiRecommended")} — top {aiRecommendedIds.length} clips pre-selected by viral score
              </span>
            </div>
          )}

          <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-5 pb-5">
            {/* Available clips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("highlightReel.availableClips")} ({availableClips.length})
                </label>
                <span className="text-[10px] text-muted-foreground/60">{t("highlightReel.clickToAdd")}</span>
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {availableClips.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground/50">{t("highlightReel.allClipsSelected")}</div>
                ) : (
                  availableClips.map((clip) => (
                    <button
                      key={clip.id}
                      onClick={() => toggleSelect(clip.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border/30 bg-card/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
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
                          {clip.duration_seconds && (
                            <span className="text-[10px] text-muted-foreground">{clip.duration_seconds}s</span>
                          )}
                          {clip.viral_score != null && (
                            <span className="text-[10px] text-accent">⚡{clip.viral_score}</span>
                          )}
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selected clips + drag + timing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("highlightReel.selected")} ({selectedIds.length}/10)
                </label>
                {totalDuration > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {formatDur(totalDuration)}
                  </span>
                )}
              </div>

              {selectedIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border/30 text-muted-foreground/40">
                  <Film className="w-8 h-8 mb-2" />
                  <p className="text-xs">{t("highlightReel.addClipsFromLeft")}</p>
                  <p className="text-[10px] mt-0.5">{t("highlightReel.minimum2max10")}</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
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
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="px-6 pb-5 space-y-4 border-t border-border/30 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subtitle Style — shared component */}
              <div>
                <SubtitleStylePicker
                  value={subtitleStyle}
                  onChange={setSubtitleStyle}
                />
              </div>

              {/* Transitions toggle */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("highlightReel.transitions")}</label>
                <button
                  onClick={() => setAddTransitions(!addTransitions)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    addTransitions
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border/30 bg-card/20 text-muted-foreground"
                  }`}
                >
                  <span>{addTransitions ? `✓ ${t("highlightReel.crossfade")} (0.5s)` : t("highlightReel.noTransitions")}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${addTransitions ? "bg-accent" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${addTransitions ? "left-4" : "left-0.5"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/40 shrink-0">
          <div className="text-xs text-muted-foreground">
            {selectedIds.length < 2
              ? t("highlightReel.selectMore", { count: 2 - selectedIds.length })
              : t("highlightReel.nClipsDuration", { count: selectedIds.length, duration: formatDur(totalDuration) })}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>{t("upload.cancel")}</Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleSubmit}
              disabled={selectedIds.length < 2 || creating}
              className="min-w-[180px]"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEditing ? t("highlightReel.saving") : t("highlightReel.creating")}</>
              ) : isEditing ? (
                <><Sparkles className="w-4 h-4 mr-2" /> {t("highlightReel.saveReRender")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> {t("highlightReel.createReel")}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

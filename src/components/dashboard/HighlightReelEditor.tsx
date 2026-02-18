import { useState, useMemo } from "react";
import { X, GripVertical, Sparkles, Clock, Loader2, Plus, Minus, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import ClipVideoThumbnail from "@/components/dashboard/ClipVideoThumbnail";
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
}

const CAPTION_STYLES = ["hormozi", "mrbeast", "minimal"] as const;

function SortableClipItem({
  clip,
  index,
  onRemove,
}: {
  clip: Tables<"clips">;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isDragging
          ? "border-primary/50 bg-primary/10"
          : "border-border/40 bg-card/40"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-xs font-mono text-muted-foreground/50 w-4 shrink-0">{index + 1}</span>
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
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{clip.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {clip.duration_seconds && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{clip.duration_seconds}s
            </span>
          )}
          {clip.viral_score != null && (
            <span className="text-[10px] text-accent">⚡ {clip.viral_score}/10</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(clip.id)}
        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function HighlightReelEditor({ video, clips, onClose }: HighlightReelEditorProps) {
  const [title, setTitle] = useState(`Best of ${video.title}`);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [captionStyle, setCaptionStyle] = useState<string>("hormozi");
  const [addTransitions, setAddTransitions] = useState(true);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedClips = useMemo(
    () => selectedIds.map((id) => clips.find((c) => c.id === id)!).filter(Boolean),
    [selectedIds, clips]
  );

  const totalDuration = useMemo(
    () => selectedClips.reduce((sum, c) => sum + (c.duration_seconds || 0), 0),
    [selectedClips]
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
      toast.warning("Maximum 10 clips per reel");
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

  const handleCreate = async () => {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 clips");
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: reel, error } = await supabase
        .from("highlight_reels" as any)
        .insert({
          user_id: user.id,
          video_id: video.id,
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

      const clipsPayload = selectedClips.map((c) => ({
        clip_id: c.id,
        start_time: parseFloat(c.start_time || "0"),
        end_time: parseFloat(c.end_time || "0"),
      }));

      // Fire-and-forget to Modal worker
      fetch("https://vtrushch--cutviral-worker-webhook.modal.run/create-highlight-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reel_id: (reel as any).id,
          video_storage_path: video.file_path,
          clips: clipsPayload,
          caption_style: captionStyle,
          add_transitions: addTransitions,
        }),
      }).catch(() => {});

      toast.success("Highlight reel is being created! Check back in a few minutes.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create highlight reel");
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
              <h2 className="text-base font-bold text-foreground">Highlight Reel Editor</h2>
              <p className="text-xs text-muted-foreground">Combine your best clips into one video</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-6 pt-5 pb-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Reel Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/40 bg-card/40 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              placeholder="My Highlight Reel"
            />
          </div>

          <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-5 pb-5">
            {/* Available clips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Clips ({availableClips.length})
                </label>
                <span className="text-[10px] text-muted-foreground/60">Click to add</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {availableClips.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground/50">All clips selected</div>
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

            {/* Selected clips + drag */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Selected ({selectedIds.length}/10)
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
                  <p className="text-xs">Add clips from the left</p>
                  <p className="text-[10px] mt-0.5">Minimum 2, maximum 10</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                      {selectedClips.map((clip, i) => (
                        <SortableClipItem
                          key={clip.id}
                          clip={clip}
                          index={i}
                          onRemove={removeFromSelected}
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
              {/* Caption style */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Caption Style</label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Transitions</label>
                <button
                  onClick={() => setAddTransitions(!addTransitions)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                    addTransitions
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border/30 bg-card/20 text-muted-foreground"
                  }`}
                >
                  <span>{addTransitions ? "✓ Crossfade (0.5s)" : "No transitions"}</span>
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
              ? `Select at least ${2 - selectedIds.length} more clip${2 - selectedIds.length !== 1 ? "s" : ""}`
              : `${selectedIds.length} clips · ${formatDur(totalDuration)}`}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleCreate}
              disabled={selectedIds.length < 2 || creating}
              className="min-w-[180px]"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Create Highlight Reel</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

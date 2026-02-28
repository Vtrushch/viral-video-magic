import { Trash2, Download, Loader2, Film, Clock, Layers, Eye, Pencil, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadClip, clipFilename } from "@/lib/downloadClip";
import { useTranslation } from "react-i18next";

interface Reel {
  id: string;
  title: string;
  status: string;
  duration_seconds: number | null;
  clip_ids: string[];
  clip_order: number[];
  file_path: string | null;
  caption_style: string;
  add_transitions: boolean;
  created_at: string;
  description?: string | null;
  ai_plan?: any;
}

interface HighlightReelCardProps {
  reel: Reel;
  onDelete: (id: string) => void;
  onEdit?: (reel: Reel) => void;
}

export default function HighlightReelCard({ reel, onDelete, onEdit }: HighlightReelCardProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:   { label: t("videoCard.pending"),    color: "text-yellow-400",    bg: "bg-yellow-500/10",    border: "border-yellow-500/20" },
    rendering: { label: t("videoCard.rendering"),  color: "text-blue-400",      bg: "bg-blue-500/10",      border: "border-blue-500/20" },
    ready:     { label: t("videoCard.ready"),      color: "text-accent",        bg: "bg-accent/10",        border: "border-accent/20" },
    failed:    { label: t("videoCard.failed"),     color: "text-destructive",   bg: "bg-destructive/10",   border: "border-destructive/20" },
  };

  const status = STATUS_STYLES[reel.status] || STATUS_STYLES.pending;
  const isRendering = reel.status === "rendering" || reel.status === "pending";

  const formatDur = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const handleDownload = async () => {
    if (!reel.file_path) return;
    setDownloading(true);
    try {
      await downloadClip(reel.file_path, clipFilename(reel.title, reel.id));
    } catch {
      // downloadClip already shows error toast
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("highlight_reels" as any)
        .delete()
        .eq("id", reel.id);
      if (error) throw error;
      toast.success(t("common.reelDeleted"));
      onDelete(reel.id);
    } catch {
      toast.error(t("common.reelDeleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border/50 overflow-hidden group transition-all duration-200 hover:border-border" style={{ background: "hsl(240, 15%, 10%)" }}>
        {/* Full-width video preview */}
        <div className="relative w-full bg-black overflow-hidden" style={{ height: '280px' }}>
          {reel.status === 'ready' && reel.file_path ? (
            <video
              src={reel.file_path}
              className="w-full h-full object-contain"
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${status.color} ${status.bg} ${status.border} ${reel.status === "rendering" ? "animate-pulse" : ""}`}>
              {reel.status === "rendering" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
              {status.label}
            </span>
          </div>
          {/* Play overlay for ready reels */}
          {reel.status === "ready" && reel.file_path && (
            <button
              onClick={() => setShowPreview(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
            >
              <Play className="w-10 h-10 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{reel.title}</h3>
          {reel.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">{reel.description}</p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{reel.clip_ids.length} {t("common.clips")}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDur(reel.duration_seconds)}</span>
          </div>

          {isRendering && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-[10px] text-primary animate-pulse">{t("common.rendering")} ~2-5 min</span>
            </div>
          )}

          {/* AI Plan roles — deduplicated */}
          {reel.ai_plan?.clips && (
            <div className="flex flex-wrap gap-1">
              {[...new Set(reel.ai_plan.clips.map((c: any) => c.role).filter(Boolean))].map((role: string) => (
                <span
                  key={role}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 border border-primary/15"
                >
                  {role}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {reel.status === "ready" && reel.file_path && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {t("common.download")}
              </button>
            )}
            {reel.status === "ready" && reel.file_path && (
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-muted-foreground text-xs font-medium hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {t("common.preview")}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(reel)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-muted-foreground text-xs font-medium hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("common.edit")}
              </button>
            )}
            {/* Delete */}
            {showConfirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-destructive font-medium">{t("common.delete")}?</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : t("common.yes")}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground" onClick={() => setShowConfirmDelete(false)}>
                  {t("common.no")}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center justify-center w-8 py-1.5 rounded-lg border border-border/50 text-muted-foreground/50 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Preview Modal */}
      {showPreview && reel.file_path && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{reel.title}</h3>
                <p className="text-xs text-muted-foreground">{reel.clip_ids.length} {t("common.clips")} · {formatDur(reel.duration_seconds)}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[9/16] bg-black">
              <video
                src={reel.file_path}
                controls
                autoPlay
                className="w-full h-full object-contain"
                playsInline
              />
            </div>
            {reel.status === "ready" && (
              <Button variant="hero" className="w-full mt-3" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {t("videoDetail.downloadReel")}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
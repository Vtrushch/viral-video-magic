import { Trash2, Download, Loader2, Film, Clock, Layers, Eye, Pencil, Play, X, Zap, AlertTriangle, RotateCcw } from "lucide-react";
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
  onRender?: (reel: Reel) => void;
}

export default function HighlightReelCard({ reel, onDelete, onEdit, onRender }: HighlightReelCardProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const statusDot = (status: string) => {
    if (status === "ready") return "bg-accent";
    if (status === "rendering") return "bg-secondary animate-pulse";
    if (status === "failed") return "bg-destructive";
    if (status === "pending") return "bg-muted-foreground/40";
    return "bg-muted-foreground/40";
  };

  const formatDur = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const isRendering = reel.status === "rendering";
  const isReady = reel.status === "ready";
  const isPending = reel.status === "pending";
  const isFailed = reel.status === "failed";

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
      <div className="glass-card-hover rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          {/* 9:16 thumbnail */}
          <div
            className="w-16 h-28 rounded-lg flex-shrink-0 overflow-hidden relative cursor-pointer"
            style={{ background: "linear-gradient(180deg, hsl(240,15%,14%) 0%, hsl(240,15%,10%) 100%)" }}
            onClick={() => isReady && reel.file_path && setShowPreview(true)}
          >
            {isReady && reel.file_path ? (
              <video
                src={reel.file_path}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-6 h-6 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(reel.status)}`} />
                <h4 className="text-sm font-semibold text-foreground truncate">{reel.title}</h4>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3" />{reel.clip_ids.length} {t("common.clips")}</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{formatDur(reel.duration_seconds)}</span>
              </div>
              {reel.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{reel.description}</p>
              )}
            </div>

            {/* Rendering indicator */}
            {isRendering && (
              <div className="flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-[10px] text-primary animate-pulse">{t("common.rendering")} ~2-5 min</span>
              </div>
            )}

            {/* Failed indicator */}
            {isFailed && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-[10px] text-destructive">{t("videoDetail.renderingFailed")}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Preview — only when ready */}
              {isReady && reel.file_path && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("common.preview")}</span>
                </Button>
              )}

              {/* Edit — always available except when rendering */}
              {onEdit && !isRendering && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(reel)}
                >
                  <Pencil className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("common.edit")}</span>
                </Button>
              )}

              {/* Render — when pending */}
              {isPending && onRender && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 min-h-[44px] px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => onRender(reel)}
                >
                  <Zap className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("common.render")}</span>
                </Button>
              )}

              {/* Try Again — when failed */}
              {isFailed && onRender && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 min-h-[44px] px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => onRender(reel)}
                >
                  <RotateCcw className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">{t("common.tryAgain")}</span>
                </Button>
              )}

              {/* Download — only when ready */}
              {isReady && reel.file_path && (
                <button
                  className="inline-flex items-center gap-1 h-7 min-h-[44px] px-2 text-xs text-accent hover:text-accent rounded-md hover:bg-accent/10 transition-colors disabled:opacity-50"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 sm:mr-0.5" />}
                  <span className="hidden sm:inline">{t("common.download")}</span>
                </button>
              )}

              {/* Delete */}
              {!isRendering && (
                showConfirmDelete ? (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 min-h-[44px] px-2 text-xs text-muted-foreground/50 hover:text-destructive"
                    onClick={() => setShowConfirmDelete(true)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Clips count circle (matching viral score position) */}
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 self-start">
            <span className="text-sm font-bold text-primary">{reel.clip_ids.length}</span>
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
            {/* Close button — always visible */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-1 -right-1 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center justify-between mb-3 pr-10">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{reel.title}</h3>
                <p className="text-xs text-muted-foreground">{reel.clip_ids.length} {t("common.clips")} · {formatDur(reel.duration_seconds)}</p>
              </div>
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
            {isReady && (
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

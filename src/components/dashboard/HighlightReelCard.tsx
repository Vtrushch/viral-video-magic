import { Trash2, Download, Loader2, Film, Clock, Layers, Eye, Pencil, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "Pending",    color: "text-yellow-400",    bg: "bg-yellow-500/10",    border: "border-yellow-500/20" },
  rendering: { label: "Rendering",  color: "text-blue-400",      bg: "bg-blue-500/10",      border: "border-blue-500/20" },
  ready:     { label: "Ready",      color: "text-accent",        bg: "bg-accent/10",        border: "border-accent/20" },
  failed:    { label: "Failed",     color: "text-destructive",   bg: "bg-destructive/10",   border: "border-destructive/20" },
};

export default function HighlightReelCard({ reel, onDelete, onEdit }: HighlightReelCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      const response = await fetch(reel.file_path);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reel.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloading reel...");
    } catch {
      toast.error("Failed to download reel");
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
      toast.success("Reel deleted");
      onDelete(reel.id);
    } catch {
      toast.error("Failed to delete reel");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="glass-card rounded-xl p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
          <Film className="w-5 h-5 text-primary-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground truncate">{reel.title}</h4>
            <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${status.color} ${status.bg} ${status.border} ${reel.status === "rendering" ? "animate-pulse" : ""}`}>
              {reel.status === "rendering" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
              {status.label}
            </span>
            {reel.ai_plan && (
              <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border border-primary/20 bg-primary/10 text-primary">
                ✨ AI
              </span>
            )}
          </div>
          {reel.description && (
            <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1">{reel.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{reel.clip_ids.length} clips</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDur(reel.duration_seconds)}</span>
          </div>
          {isRendering && (
            <div className="flex items-center gap-1.5 mt-1">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-[10px] text-primary animate-pulse">Rendering... ~2-5 min</span>
            </div>
          )}
          {/* AI Plan roles */}
          {reel.ai_plan?.clips && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {reel.ai_plan.clips.map((c: any, i: number) => (
                <span
                  key={i}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 border border-primary/15"
                  title={c.reason}
                >
                  {c.role}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {/* Preview — only when ready */}
          {reel.status === "ready" && reel.file_path && (
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
            </Button>
          )}

          {/* Edit */}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(reel)} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}

          {/* Download */}
          {reel.status === "ready" && reel.file_path && (
            <Button variant="hero-outline" size="sm" onClick={handleDownload} disabled={downloading} className="h-8 text-xs">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" />Download</>}
            </Button>
          )}

          {/* Delete */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-destructive font-medium">Delete?</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-muted-foreground"
                onClick={() => setShowConfirmDelete(false)}
              >
                No
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
              onClick={() => setShowConfirmDelete(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
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
                <p className="text-xs text-muted-foreground">{reel.clip_ids.length} clips · {formatDur(reel.duration_seconds)}</p>
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
                Download Reel
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

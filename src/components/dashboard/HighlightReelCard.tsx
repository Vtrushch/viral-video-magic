import { Trash2, Download, Loader2, Film, Clock, Layers } from "lucide-react";
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
  file_path: string | null;
  created_at: string;
}

interface HighlightReelCardProps {
  reel: Reel;
  onDelete: (id: string) => void;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  rendering: { label: "Rendering", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  ready: { label: "Ready", color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" },
  failed: { label: "Failed", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

export default function HighlightReelCard({ reel, onDelete }: HighlightReelCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = STATUS_STYLES[reel.status] || STATUS_STYLES.pending;

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
    <div className="glass-card rounded-xl p-4 flex items-center gap-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
        <Film className="w-5 h-5 text-primary-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground truncate">{reel.title}</h4>
          <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${status.color} ${status.bg} ${status.border} ${reel.status === "rendering" ? "animate-pulse" : ""}`}>
            {reel.status === "rendering" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{reel.clip_ids.length} clips</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDur(reel.duration_seconds)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {reel.status === "ready" && reel.file_path && (
          <Button variant="hero-outline" size="sm" onClick={handleDownload} disabled={downloading} className="h-8 text-xs">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" />Download</>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

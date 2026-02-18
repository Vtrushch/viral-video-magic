import { Trash2, Eye, Clock, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface VideoCardProps {
  id: string;
  title: string;
  duration: string;
  uploadDate: string;
  status: "uploading" | "analyzing" | "ready";
  thumbnail?: string;
  filePath?: string;
  fileSize?: number;
}

const statusColors: Record<string, string> = {
  uploading: "bg-yellow-500/10 text-yellow-500",
  analyzing: "bg-secondary/10 text-secondary",
  ready: "bg-accent/10 text-accent",
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const VideoCard = ({ id, title, duration, uploadDate, status, thumbnail, filePath, fileSize }: VideoCardProps) => {
  const { t } = useTranslation();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted");
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      uploading: t("videoCard.uploading"),
      analyzing: t("videoCard.analyzing"),
      ready: t("videoCard.ready"),
      rendering: t("videoCard.rendering"),
      failed: t("videoCard.failed"),
      pending: t("videoCard.pending"),
    };
    return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div
      className="group rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ background: "#252535", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden" style={{ background: "#1F1F2E" }}>
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))" }}>
              <Eye className="w-6 h-6" style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {statusLabel(status)}
          </span>
        </div>
        {duration && duration !== "—" && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
            {duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 truncate" style={{ color: "#fff" }}>{title}</h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{uploadDate}</span>
          {fileSize ? (
            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatFileSize(fileSize)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button variant="ghost" size="sm" className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.7)" }} asChild>
            <Link to={`/dashboard/videos/${id}`}>{t("videoCard.viewClips")}</Link>
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8" style={{ color: "rgba(255,255,255,0.4)" }} onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;

import { MoreHorizontal, Trash2, Eye, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface VideoCardProps {
  id: string;
  title: string;
  duration: string;
  uploadDate: string;
  status: "uploading" | "analyzing" | "ready";
  thumbnail?: string;
}

const statusColors: Record<string, string> = {
  uploading: "bg-yellow-500/10 text-yellow-500",
  analyzing: "bg-secondary/10 text-secondary",
  ready: "bg-accent/10 text-accent",
};

const VideoCard = ({ id, title, duration, uploadDate, status, thumbnail }: VideoCardProps) => {
  return (
    <div
      className="group rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ background: "#2A2A3E", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden" style={{ background: "#1F1F2E" }}>
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Eye className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 truncate" style={{ color: "#fff" }}>{title}</h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{duration}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{uploadDate}</span>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button variant="ghost" size="sm" className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.7)" }} asChild>
            <Link to={`/dashboard/videos/${id}`}>View Clips</Link>
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;

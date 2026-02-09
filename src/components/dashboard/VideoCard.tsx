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
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <Eye className="w-6 h-6 text-muted-foreground" />
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
        <h3 className="font-semibold text-sm mb-2 truncate">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{duration}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{uploadDate}</span>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" className="flex-1 text-xs" asChild>
            <Link to={`/dashboard/videos/${id}`}>View Clips</Link>
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;

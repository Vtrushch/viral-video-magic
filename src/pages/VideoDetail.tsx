import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Download, Star, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const demoClips = [
  { id: "c1", title: "The #1 mistake SaaS founders make", duration: "0:42", viralScore: 9, status: "ready" },
  { id: "c2", title: "Why pricing matters more than product", duration: "0:58", viralScore: 7, status: "ready" },
  { id: "c3", title: "This growth hack changed everything", duration: "0:35", viralScore: 8, status: "rendering" },
  { id: "c4", title: "The future of AI in business", duration: "0:50", viralScore: 6, status: "pending" },
];

const scoreColors: Record<number, string> = {
  9: "bg-accent/10 text-accent",
  8: "bg-accent/10 text-accent",
  7: "bg-secondary/10 text-secondary",
  6: "bg-muted text-muted-foreground",
};

const VideoDetail = () => {
  const { id } = useParams();

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to videos
        </Link>
        <h1 className="text-2xl font-bold">How to Build a SaaS in 2025</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />45:30</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Feb 7, 2026</span>
          <Badge className="bg-accent/10 text-accent border-0">Ready</Badge>
        </div>
      </div>

      {/* Video Player Placeholder */}
      <div className="aspect-video rounded-xl bg-muted border border-border mb-10 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform glow-primary">
          <Play className="w-6 h-6 text-primary-foreground ml-1" />
        </div>
      </div>

      {/* Clips */}
      <div>
        <h2 className="text-xl font-bold mb-6">Generated Clips</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {demoClips.map((clip) => (
            <div
              key={clip.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
            >
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                <Play className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{clip.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{clip.duration}</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${scoreColors[clip.viralScore] || "bg-muted text-muted-foreground"}`}>
                    <Star className="w-3 h-3" />
                    {clip.viralScore}/10
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{clip.status}</span>
                </div>
              </div>

              {/* Actions */}
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={clip.status !== "ready"}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import VideoCard from "@/components/dashboard/VideoCard";
import UploadModal from "@/components/dashboard/UploadModal";

const demoVideos = [
  {
    id: "demo-1",
    title: "How to Build a SaaS in 2025",
    duration: "45:30",
    uploadDate: "Feb 7, 2026",
    status: "ready" as const,
  },
  {
    id: "demo-2",
    title: "Marketing Strategies That Actually Work",
    duration: "1:02:15",
    uploadDate: "Feb 5, 2026",
    status: "analyzing" as const,
  },
  {
    id: "demo-3",
    title: "Podcast Episode #42 - Creator Economy",
    duration: "38:22",
    uploadDate: "Feb 3, 2026",
    status: "ready" as const,
  },
];

const Dashboard = () => {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Videos</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and repurpose your content</p>
        </div>
        <Button variant="hero" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Video
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsCards />
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoVideos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}

        {/* Add New Card */}
        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-xl border-2 border-dashed border-border hover:border-primary/30 flex flex-col items-center justify-center min-h-[280px] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Upload a video</p>
        </button>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
};

export default Dashboard;

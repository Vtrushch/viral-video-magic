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
    <div className="p-6 lg:p-8 max-w-7xl" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#fff" }}>Your Videos</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Manage and repurpose your content</p>
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
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center min-h-[280px] transition-all group"
          style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.02)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,45,85,0.4)"; e.currentTarget.style.background = "rgba(255,45,85,0.03)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))" }}>
            <Plus className="w-5 h-5 transition-colors" style={{ color: "#FF2D55" }} />
          </div>
          <p className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.6)" }}>Upload a video</p>
        </button>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
};

export default Dashboard;

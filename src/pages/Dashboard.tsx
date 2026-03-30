import { useState, useEffect } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import VideoCard from "@/components/dashboard/VideoCard";
import UploadModal from "@/components/dashboard/UploadModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videos, setVideos] = useState<Tables<"videos">[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  const fetchVideos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!error && data) setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("videos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "videos",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 lg:p-8 w-full overflow-x-hidden animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#fff" }}>{t("dashboard.yourVideos")}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{t("dashboard.manageContent")}</p>
        </div>
        <Button variant="hero" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          {t("dashboard.uploadVideo")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsCards videos={videos} />
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: "hsl(240,15%,10%)", height: "280px" }} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))" }}>
            <Upload className="w-7 h-7" style={{ color: "#FF2D55" }} />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>{t("dashboard.noVideosYet")}</h3>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>{t("dashboard.uploadFirst")}</p>
          <Button variant="hero" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t("dashboard.uploadVideo")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              duration={video.duration || "—"}
              uploadDate={formatDate(video.created_at)}
              status={video.status as "uploading" | "analyzing" | "ready"}
              thumbnail={video.thumbnail_url || undefined}
              filePath={video.file_path || undefined}
              fileSize={video.file_size || undefined}
              onDelete={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
            />
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
            <p className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.6)" }}>{t("dashboard.uploadAVideo")}</p>
          </button>
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* Mobile FAB — floating upload button above bottom nav */}
      <button
        onClick={() => setUploadOpen(true)}
        className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg md:hidden transition-transform active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(349,100%,59%), hsl(270,95%,65%))",
          boxShadow: "0 4px 20px rgba(255,45,85,0.4)",
        }}
        aria-label="Upload Video"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default Dashboard;

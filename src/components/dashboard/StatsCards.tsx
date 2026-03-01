import { Video, Film, Calendar, HardDrive } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";

interface StatsCardsProps {
  videos: Tables<"videos">[];
}

const formatStorage = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const StatsCards = ({ videos }: StatsCardsProps) => {
  const { t } = useTranslation();
  const totalVideos = videos.length;
  const totalClips = 0;
  
  const activeCount = videos.filter((v) => v.status !== "failed").length;
  const totalStorage = videos.reduce((acc, v) => acc + (v.file_size || 0), 0);

  const stats = [
    { icon: Video, label: t("stats.totalVideos"), value: String(totalVideos) },
    { icon: Film, label: t("stats.totalClips"), value: String(totalClips) },
    { icon: Calendar, label: t("stats.activeVideos"), value: String(activeCount) },
    { icon: HardDrive, label: t("stats.storageUsed"), value: totalStorage > 0 ? formatStorage(totalStorage) : "0 MB" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-5 rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(42,42,62,0.8)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,45,85,0.3)"; e.currentTarget.style.boxShadow = "0 4px 30px rgba(255,45,85,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)"; }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))" }}>
              <stat.icon className="w-5 h-5" style={{ color: "#FF2D55" }} />
            </div>
          </div>
          <p className="text-4xl font-bold" style={{ color: "#fff" }}>{stat.value}</p>
          <p className="text-sm mt-1" style={{ color: "#E5E5E5" }}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

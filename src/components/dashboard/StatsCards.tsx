import { Video, Film, Calendar, HardDrive } from "lucide-react";

const stats = [
  { icon: Video, label: "Total Videos", value: "0", color: "text-primary" },
  { icon: Film, label: "Total Clips", value: "0", color: "text-secondary" },
  { icon: Calendar, label: "Clips This Month", value: "0", color: "text-accent" },
  { icon: HardDrive, label: "Storage Used", value: "0 MB", color: "text-muted-foreground" },
];

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-5 rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(31,31,46,0.8)",
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
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

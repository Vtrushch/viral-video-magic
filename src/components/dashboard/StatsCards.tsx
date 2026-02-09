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
        <div key={stat.label} className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-sm text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

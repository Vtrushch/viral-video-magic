import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import {
  Video, Film, CheckCircle2, Star, Zap, Upload, Sparkles, Clock, TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5"
    style={{
      background: "hsl(240,15%,10%)",
      border: "1px solid hsl(0,0%,100%,0.07)",
      boxShadow: `0 4px 24px -8px ${color}33`,
    }}
  >
    <div className="flex items-center justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
    <div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  </div>
);

const CreditsBar = ({ used, total }: { used: number; total: number }) => {
  const { t } = useTranslation();
  const remaining = total - used;
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "hsl(240,15%,10%)", border: "1px solid hsl(0,0%,100%,0.07)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> {t("analytics.creditUsage")}
        </h3>
        <span className="text-xs text-muted-foreground">{t("analytics.usedOfTotal", { used, total })}</span>
      </div>

      <div className="h-4 rounded-full overflow-hidden" style={{ background: "hsl(0,0%,100%,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${usedPct}%`,
            background: "linear-gradient(90deg, hsl(349,100%,59%), hsl(270,95%,65%))",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "hsl(349,100%,59%,0.08)", border: "1px solid hsl(349,100%,59%,0.15)" }}>
          <p className="text-xl font-bold" style={{ color: "hsl(349,100%,59%)" }}>{used}</p>
          <p className="text-xs text-muted-foreground">{t("settings.used")}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "hsl(177,100%,39%,0.08)", border: "1px solid hsl(177,100%,39%,0.15)" }}>
          <p className="text-xl font-bold" style={{ color: "hsl(177,100%,39%)" }}>{remaining}</p>
          <p className="text-xs text-muted-foreground">{t("settings.remaining")}</p>
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const { t } = useTranslation();

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["analytics-videos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: clips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ["analytics-clips", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clips").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rendered = clips.filter((c) => c.status === "ready").length;
    const scored = clips.filter((c) => c.viral_score != null);
    const avgScore = scored.length > 0
      ? (scored.reduce((sum, c) => sum + (c.viral_score || 0), 0) / scored.length).toFixed(1)
      : "—";
    return { totalVideos: videos.length, totalClips: clips.length, rendered, avgScore };
  }, [videos, clips]);

  const recentActivity = useMemo(() => {
    type ActivityItem = { type: string; title: string; time: string; icon: React.ElementType; color: string };
    const items: ActivityItem[] = [];

    for (const v of videos.slice(0, 5)) {
      if (v.status === "uploaded" || v.status === "uploading") {
        items.push({ type: "uploaded", title: v.title, time: v.created_at, icon: Upload, color: "hsl(349,100%,59%)" });
      } else if (v.status === "analyzing") {
        items.push({ type: "analyzing", title: v.title, time: v.updated_at, icon: Sparkles, color: "hsl(270,95%,65%)" });
      } else if (v.status === "ready") {
        items.push({ type: "analyzed", title: v.title, time: v.updated_at, icon: CheckCircle2, color: "hsl(177,100%,39%)" });
      }
    }

    for (const c of clips.slice(0, 8)) {
      if (c.status === "ready") {
        items.push({ type: "rendered", title: c.title, time: c.render_completed_at || c.created_at, icon: Film, color: "hsl(177,100%,39%)" });
      } else if (c.status === "rendering") {
        items.push({ type: "rendering", title: c.title, time: c.render_started_at || c.created_at, icon: Zap, color: "hsl(270,95%,65%)" });
      }
    }

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
  }, [videos, clips]);

  // Weekly activity data for chart (last 4 weeks)
  const weeklyData = useMemo(() => {
    const weeks: { week: string; videos: number; clips: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const vCount = videos.filter((v) => {
        const d = new Date(v.created_at);
        return d >= start && d < end;
      }).length;
      const cCount = clips.filter((c) => {
        const d = new Date(c.created_at);
        return d >= start && d < end;
      }).length;
      weeks.push({ week: label, videos: vCount, clips: cCount });
    }
    return weeks;
  }, [videos, clips]);

  // Viral score distribution for bar chart
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "1-3", count: 0 },
      { range: "4-5", count: 0 },
      { range: "6-7", count: 0 },
      { range: "8-9", count: 0 },
      { range: "10", count: 0 },
    ];
    for (const c of clips) {
      const s = c.viral_score ?? 0;
      if (s <= 3) buckets[0].count++;
      else if (s <= 5) buckets[1].count++;
      else if (s <= 7) buckets[2].count++;
      else if (s <= 9) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [clips]);

  const loading = videosLoading || clipsLoading;

  return (
    <div className="p-6 lg:p-8 w-full animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("analytics.subtitle")}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl h-32 animate-pulse" style={{ background: "hsl(240,15%,10%)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Video} label={t("analytics.videosUploaded")} value={stats.totalVideos} color="hsl(349,100%,59%)" />
          <StatCard icon={Film} label={t("analytics.clipsGenerated")} value={stats.totalClips} color="hsl(270,95%,65%)" />
          <StatCard icon={CheckCircle2} label={t("analytics.clipsRendered")} value={stats.rendered} sub={`${stats.totalClips > 0 ? Math.round((stats.rendered / stats.totalClips) * 100) : 0}%`} color="hsl(177,100%,39%)" />
          <StatCard icon={Star} label={t("analytics.avgViralScore")} value={stats.avgScore} sub={t("analytics.outOf10")} color="hsl(50,100%,60%)" />
        </div>
      )}

      {/* Charts row */}
      {!loading && (videos.length > 0 || clips.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity Chart */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(240,15%,10%)", border: "1px solid hsl(0,0%,100%,0.07)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("analytics.weeklyActivity", "Weekly Activity")}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(349,100%,59%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(349,100%,59%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(270,95%,65%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(270,95%,65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fill: "hsl(0,0%,60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(0,0%,60%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(240,15%,14%)", border: "1px solid hsl(0,0%,100%,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="videos" stroke="hsl(349,100%,59%)" fill="url(#colorVideos)" strokeWidth={2} name={t("analytics.videosUploaded", "Videos")} />
                  <Area type="monotone" dataKey="clips" stroke="hsl(270,95%,65%)" fill="url(#colorClips)" strokeWidth={2} name={t("analytics.clipsGenerated", "Clips")} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Viral Score Distribution */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(240,15%,10%)", border: "1px solid hsl(0,0%,100%,0.07)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" /> {t("analytics.scoreDistribution", "Viral Score Distribution")}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <XAxis dataKey="range" tick={{ fill: "hsl(0,0%,60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(0,0%,60%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(240,15%,14%)", border: "1px solid hsl(0,0%,100%,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="hsl(177,100%,39%)" radius={[4, 4, 0, 0]} name={t("analytics.clipsGenerated", "Clips")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditsBar used={credits?.used_credits ?? 0} total={credits?.total_credits ?? 0} />

        <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(240,15%,10%)", border: "1px solid hsl(0,0%,100%,0.07)" }}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> {t("analytics.recentActivity")}
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "hsl(0,0%,100%,0.04)" }} />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t("analytics.noActivity")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("analytics.uploadToStart")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 hidden sm:block">
                      {formatDate(item.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

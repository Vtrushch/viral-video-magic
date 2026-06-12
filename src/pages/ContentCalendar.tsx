import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  CheckCircle2, Clock, Film, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import SchedulePostDialog, { POST_PLATFORMS } from "@/components/calendar/SchedulePostDialog";
import type { Tables } from "@/integrations/supabase/types";

type ScheduledPost = Tables<"scheduled_posts"> & {
  clips: { title: string; thumbnail_url: string | null; file_path: string | null } | null;
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "hsl(174,100%,45%)",
  instagram: "hsl(329,70%,58%)",
  youtube: "hsl(0,87%,55%)",
  facebook: "hsl(214,89%,52%)",
  twitter: "hsl(210,10%,75%)",
  linkedin: "hsl(201,100%,35%)",
};

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const ContentCalendar = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*, clips(title, thumbnail_url, file_path)")
      .order("scheduled_at", { ascending: true });
    if (error) {
      console.error("Calendar fetch error:", error);
      setPosts([]);
    } else {
      setPosts((data as ScheduledPost[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Month grid math ── */
  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    // Week starts Monday
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return cells;
  }, [viewDate]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
    // 2024-01-01 was a Monday
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [i18n.language]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(viewDate),
    [viewDate, i18n.language]
  );

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts) {
      const d = new Date(p.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [posts]);

  const dayPosts = (d: Date) => postsByDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || [];

  const visiblePosts = useMemo(() => {
    if (selectedDay) return dayPosts(selectedDay);
    const now = new Date();
    return posts.filter((p) => p.status === "scheduled" && new Date(p.scheduled_at) >= now).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, posts, postsByDay]);

  /* ── Actions ── */
  const markPublished = async (post: ScheduledPost) => {
    const { error } = await supabase.from("scheduled_posts").update({ status: "published" }).eq("id", post.id);
    if (error) toast.error(t("calendar.scheduleError"));
    else {
      toast.success(t("calendar.markedPublished"));
      fetchPosts();
    }
  };

  const deletePost = async (post: ScheduledPost) => {
    setDeletingId(post.id);
    const { error } = await supabase.from("scheduled_posts").delete().eq("id", post.id);
    setDeletingId(null);
    if (error) toast.error(t("calendar.scheduleError"));
    else {
      toast.success(t("calendar.deleted"));
      fetchPosts();
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: "bg-primary/15 text-primary border-primary/30",
      published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      missed: "bg-destructive/15 text-destructive border-destructive/30",
      canceled: "bg-muted text-muted-foreground border-border",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || styles.canceled}`}>
        {t(`calendar.status_${status}`)}
      </span>
    );
  };

  const today = new Date();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-24 md:pb-6">
      <Helmet>
        <title>{t("calendar.title")} — HookCut</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            {t("calendar.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("calendar.subtitle")}</p>
        </div>
        <Button variant="hero" size="sm" className="min-h-[44px]" onClick={() => { setEditingPost(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" />
          {t("calendar.schedulePost")}
        </Button>
      </div>

      {/* Month navigation */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            className="text-sm font-semibold text-foreground capitalize hover:text-primary transition-colors"
            onClick={() => { setViewDate(new Date()); setSelectedDay(new Date()); }}
          >
            {monthLabel}
          </button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="text-center text-[10px] uppercase tracking-wide text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map((d, i) => {
            const inMonth = d.getMonth() === viewDate.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = selectedDay && sameDay(d, selectedDay);
            const dp = dayPosts(d);
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : d)}
                className={`relative aspect-square sm:aspect-[4/3] rounded-lg text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                  isSelected
                    ? "border-primary bg-primary/15 text-foreground"
                    : isToday
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-transparent hover:bg-muted/40 text-muted-foreground"
                } ${inMonth ? "" : "opacity-30"}`}
              >
                <span className={isToday ? "font-bold text-primary" : ""}>{d.getDate()}</span>
                {dp.length > 0 && (
                  <span className="flex gap-0.5 flex-wrap justify-center max-w-full px-0.5">
                    {dp.slice(0, 4).map((p) => (
                      <span
                        key={p.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: PLATFORM_COLORS[p.platform] || "hsl(var(--primary))", opacity: p.status === "published" ? 0.45 : 1 }}
                      />
                    ))}
                    {dp.length > 4 && <span className="text-[8px] leading-none text-muted-foreground">+{dp.length - 4}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          {selectedDay
            ? new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(selectedDay)
            : t("calendar.upcoming")}
        </h2>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : visiblePosts.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-3">
            <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{selectedDay ? t("calendar.emptyDay") : t("calendar.noUpcoming")}</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/clips")}>
              <Film className="w-4 h-4 mr-1.5" />
              {t("calendar.goToClips")}
            </Button>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const when = new Date(post.scheduled_at);
            const platformLabel = POST_PLATFORMS.find((p) => p.key === post.platform)?.label || post.platform;
            return (
              <div key={post.id} className="glass-card-hover rounded-xl p-4 flex gap-3 items-start">
                {/* Thumbnail */}
                <div className="w-12 h-20 rounded-lg flex-shrink-0 overflow-hidden bg-muted/40 flex items-center justify-center">
                  {post.clips?.thumbnail_url ? (
                    <img src={post.clips.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Film className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[post.platform] || "hsl(var(--primary))" }} />
                    <span className="text-sm font-semibold text-foreground">{platformLabel}</span>
                    {statusBadge(post.status)}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(when)}
                  </p>
                  {post.clips?.title && <p className="text-xs text-muted-foreground truncate">🎬 {post.clips.title}</p>}
                  {post.caption && <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">“{post.caption}”</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 items-end">
                  {post.status === "scheduled" && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => markPublished(post)}>
                      <CheckCircle2 className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{t("calendar.markPublished")}</span>
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => { setEditingPost(post); setDialogOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive" onClick={() => deletePost(post)} disabled={deletingId === post.id}>
                      {deletingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SchedulePostDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingPost(null); }}
        post={editingPost}
        clip={editingPost?.clips ? { id: editingPost.clip_id || "", title: editingPost.clips.title } : null}
        onSaved={fetchPosts}
      />
    </div>
  );
};

export default ContentCalendar;

import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Users, Video, Film, CheckCircle, Plus, ChevronDown, ChevronUp, Eye, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  totalClips: number;
  totalRendered: number;
}

interface UserStat {
  email: string;
  full_name?: string;
  joined: string;
  videos: number;
  clips: number;
  rendered: number;
  total_credits: number;
  used_credits: number;
  plan: string;
}

interface VideoItem {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  duration: string | null;
}

interface ClipItem {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  status: string;
  viral_score: number | null;
  start_time: string | null;
  end_time: string | null;
  caption_style: string | null;
  created_at: string;
}

const Admin = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Record<string, UserStat>>({});
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [addClipOpen, setAddClipOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState("");

  // Add clip form
  const [clipVideoId, setClipVideoId] = useState("");
  const [clipTitle, setClipTitle] = useState("");
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");
  const [clipScore, setClipScore] = useState([5]);
  const [clipCaptionStyle, setClipCaptionStyle] = useState("hormozi");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    fetchData();
  }, [isAdmin, adminLoading]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke("admin-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        toast.error("Failed to load admin data");
        return;
      }

      const d = res.data;
      setStats(d.stats);
      setUsers(d.users);
      setVideos(d.videos);
      setClips(d.clips);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClip = async () => {
    if (!clipVideoId || !clipTitle || !clipStart || !clipEnd) {
      toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const video = videos.find(v => v.id === clipVideoId);
      const { error } = await supabase.from("clips").insert({
        video_id: clipVideoId,
        user_id: video?.user_id || user!.id,
        title: clipTitle,
        start_time: clipStart,
        end_time: clipEnd,
        duration_seconds: Math.abs(parseFloat(clipEnd) - parseFloat(clipStart)),
        viral_score: clipScore[0],
        caption_style: clipCaptionStyle,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Clip added");
      setAddClipOpen(false);
      setClipTitle("");
      setClipStart("");
      setClipEnd("");
      setClipScore([5]);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add clip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCredits = async (uid: string) => {
    const amount = parseInt(creditsToAdd);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid number");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const res = await supabase.functions.invoke("admin-add-credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { user_id: uid, credits: amount },
      });
      if (res.error) throw new Error("Failed");
      toast.success(`Added ${amount} credits`);
      setCreditsToAdd("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add credits");
    } finally {
      setSubmitting(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F0F1A" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center animate-pulse">
            <Scissors className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const statCards = stats
    ? [
        { icon: Users, label: "Total Users", value: stats.totalUsers, color: "hsl(349, 100%, 59%)" },
        { icon: Video, label: "Total Videos", value: stats.totalVideos, color: "hsl(270, 95%, 65%)" },
        { icon: Film, label: "Total Clips", value: stats.totalClips, color: "hsl(177, 100%, 39%)" },
        { icon: CheckCircle, label: "Rendered", value: stats.totalRendered, color: "hsl(142, 76%, 46%)" },
      ]
    : [];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="p-4 lg:p-8 w-full overflow-x-hidden animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm mt-1 text-muted-foreground">Platform overview & management</p>
        </div>
        <Button variant="hero" onClick={() => setAddClipOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Manual Clip
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="glass-card-hover rounded-xl p-5 group cursor-default">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}20` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden mb-8">
        <div className="p-5 border-b" style={{ borderColor: "hsl(0,0%,100%,0.08)" }}>
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b" style={{ borderColor: "hsl(0,0%,100%,0.08)" }}>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Joined</TableHead>
                <TableHead className="text-muted-foreground text-center">Videos</TableHead>
                <TableHead className="text-muted-foreground text-center">Clips</TableHead>
                <TableHead className="text-muted-foreground text-center">Rendered</TableHead>
                <TableHead className="text-muted-foreground text-center">Credits</TableHead>
                <TableHead className="text-muted-foreground text-center">Used</TableHead>
                <TableHead className="text-muted-foreground text-center">Remaining</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(users).map(([uid, u]) => {
                const remaining = u.total_credits - u.used_credits;
                return (
                <>
                  <TableRow key={uid} className="border-b" style={{ borderColor: "hsl(0,0%,100%,0.06)" }}>
                    <TableCell className="text-foreground font-medium">
                      <div className="space-y-1">
                        {u.full_name && <span className="block text-xs text-muted-foreground">{u.full_name}</span>}
                        <span>{u.email}</span>
                        <span
                          className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: remaining > 0 ? "hsl(177,100%,39%,0.15)" : "hsl(0,62%,50%,0.15)",
                            color: remaining > 0 ? "hsl(177,100%,39%)" : "hsl(0,62%,50%)",
                          }}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {remaining} credits
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(u.joined)}</TableCell>
                    <TableCell className="text-center text-foreground">{u.videos}</TableCell>
                    <TableCell className="text-center text-foreground">{u.clips}</TableCell>
                    <TableCell className="text-center text-foreground">{u.rendered}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-foreground">{u.total_credits}</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors hover:scale-110"
                              style={{ background: "hsl(177,100%,39%,0.2)", color: "hsl(177,100%,39%)" }}
                              onClick={() => setCreditsToAdd("")}
                            >
                              +
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" align="center" side="bottom">
                            <div className="space-y-3">
                              <Label className="text-xs font-semibold">Add credits</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Amount"
                                value={creditsToAdd}
                                onChange={e => setCreditsToAdd(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <div className="flex gap-1.5">
                                {[5, 10, 50, 100].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setCreditsToAdd(String(n))}
                                    className="flex-1 text-xs font-medium py-1 rounded-md transition-colors hover:bg-primary/20"
                                    style={{ background: "hsl(0,0%,100%,0.06)", color: "hsl(0,0%,90%)" }}
                                  >
                                    +{n}
                                  </button>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                variant="hero"
                                className="w-full h-7 text-xs"
                                disabled={submitting || !creditsToAdd}
                                onClick={() => handleAddCredits(uid)}
                              >
                                {submitting ? "Adding..." : "Add"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-foreground">{u.used_credits}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold" style={{ color: remaining > 0 ? "hsl(177,100%,39%)" : "hsl(0,62%,50%)" }}>
                        {remaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedUser(expandedUser === uid ? null : uid)}
                        className="text-primary hover:text-primary/80"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {expandedUser === uid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedUser === uid && (
                    <TableRow key={`${uid}-detail`}>
                      <TableCell colSpan={9} className="p-4">
                        <div className="space-y-4">
                          {/* User's videos */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Videos</h4>
                            <div className="space-y-1">
                              {videos.filter(v => v.user_id === uid).length === 0 && (
                                <p className="text-xs text-muted-foreground">No videos</p>
                              )}
                              {videos.filter(v => v.user_id === uid).map(v => (
                                <div key={v.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "hsl(0,0%,100%,0.03)" }}>
                                  <span className="text-sm text-foreground">{v.title}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">{v.duration || "—"}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === "ready" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>{v.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* User's clips */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Clips</h4>
                            <div className="space-y-1">
                              {clips.filter(c => c.user_id === uid).length === 0 && (
                                <p className="text-xs text-muted-foreground">No clips</p>
                              )}
                              {clips.filter(c => c.user_id === uid).map(c => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "hsl(0,0%,100%,0.03)" }}>
                                  <span className="text-sm text-foreground">{c.title}</span>
                                  <div className="flex items-center gap-3">
                                    {c.viral_score != null && (
                                      <span className="text-xs font-medium" style={{ color: "hsl(349,100%,59%)" }}>🔥 {c.viral_score}</span>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "ready" ? "bg-accent/20 text-accent" : "bg-secondary/20 text-secondary"}`}>{c.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Clip Dialog */}
      <Dialog open={addClipOpen} onOpenChange={setAddClipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Clip</DialogTitle>
            <DialogDescription>Create a clip entry manually for any video.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Video</Label>
              <Select value={clipVideoId} onValueChange={setClipVideoId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a video" />
                </SelectTrigger>
                <SelectContent>
                  {videos.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={clipTitle} onChange={e => setClipTitle(e.target.value)} placeholder="Clip title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start (seconds)</Label>
                <Input className="mt-1" type="number" value={clipStart} onChange={e => setClipStart(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>End (seconds)</Label>
                <Input className="mt-1" type="number" value={clipEnd} onChange={e => setClipEnd(e.target.value)} placeholder="30" />
              </div>
            </div>
            <div>
              <Label>Viral Score: {clipScore[0]}</Label>
              <Slider className="mt-2" min={1} max={10} step={1} value={clipScore} onValueChange={setClipScore} />
            </div>
            <div>
              <Label>Caption Style</Label>
              <Select value={clipCaptionStyle} onValueChange={setClipCaptionStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hormozi">Hormozi</SelectItem>
                  <SelectItem value="mrbeast">MrBeast</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="hero" className="w-full" onClick={handleAddClip} disabled={submitting}>
              {submitting ? "Adding..." : "Add Clip"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

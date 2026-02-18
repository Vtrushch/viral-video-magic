import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, CreditCard, Palette, Sparkles, Zap, Crown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state
  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [clipLength, setClipLength] = useState("medium");
  const [clipCount, setClipCount] = useState("10");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Load saved preferences from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_credits")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(() => {
        setLoadingPrefs(false);
      });
    // Load preferences from user metadata if available
    const meta = user?.user_metadata || {};
    if (meta.caption_style) setCaptionStyle(meta.caption_style);
    if (meta.clip_length) setClipLength(meta.clip_length);
    if (meta.clip_count) setClipCount(meta.clip_count);
    setLoadingPrefs(false);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved!");
    }
    setSavingProfile(false);
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await supabase.auth.updateUser({
      data: { caption_style: captionStyle, clip_length: clipLength, clip_count: clipCount },
    });
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Preferences saved!");
    }
    setSavingPrefs(false);
  };

  return (
    <div className="p-6 lg:p-8 w-full animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, plan, and brand preferences</p>
      </div>

      <Tabs defaultValue="profile" className="max-w-2xl">
        <TabsList className="mb-6 bg-muted/20 border border-border/30 backdrop-blur-sm w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <Palette className="w-4 h-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <CreditCard className="w-4 h-4" />
            Plan
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-foreground text-lg">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="settingsName" className="text-sm text-foreground/80">Full Name</Label>
                <Input
                  id="settingsName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label className="text-sm text-foreground/80">Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="mt-1.5 bg-muted/10 border-border/30 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">Email cannot be changed from settings</p>
              </div>
              <Button variant="hero" size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl p-6 space-y-4" style={{ border: "1px solid hsl(0,62%,50%,0.3)", background: "hsl(0,62%,50%,0.04)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-foreground">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Deleting your account is permanent and cannot be undone. All your videos, clips, and data will be removed.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => toast.info("To delete your account, please contact support@cutviral.ai")}
            >
              Delete Account
            </Button>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h3 className="font-semibold text-foreground text-lg">Default Analysis Settings</h3>
            <p className="text-sm text-muted-foreground -mt-3">These are pre-filled when you configure a new video analysis.</p>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">Default Caption Style</Label>
              <Select value={captionStyle} onValueChange={setCaptionStyle}>
                <SelectTrigger className="bg-muted/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="hormozi">Hormozi — Bold yellow highlights</SelectItem>
                  <SelectItem value="mrbeast">MrBeast — High energy, all caps</SelectItem>
                  <SelectItem value="minimal">Minimal — Clean & elegant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">Default Clip Length</Label>
              <Select value={clipLength} onValueChange={setClipLength}>
                <SelectTrigger className="bg-muted/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="short">Short (15–30s) — TikTok</SelectItem>
                  <SelectItem value="medium">Medium (30–60s) — Instagram Reels</SelectItem>
                  <SelectItem value="long">Long (60–90s) — YouTube Shorts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">Default Clip Count</Label>
              <Select value={clipCount} onValueChange={setClipCount}>
                <SelectTrigger className="bg-muted/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="5">5 clips — Quick test</SelectItem>
                  <SelectItem value="10">10 clips — Recommended</SelectItem>
                  <SelectItem value="15">15 clips — Maximum coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="hero" size="sm" onClick={handleSavePrefs} disabled={savingPrefs || loadingPrefs}>
              {savingPrefs ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">Current Plan</h3>
              <Badge className="bg-muted/30 text-muted-foreground border border-border/30 font-medium capitalize">
                {credits?.plan || "Free"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              You're on the {credits?.plan || "free"} plan. Upgrade to unlock more credits and higher limits.
            </p>

            {/* Usage Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Credits", value: credits?.total_credits ?? 0, icon: <Zap className="w-4 h-4 text-primary" />, color: "hsl(349,100%,59%)" },
                { label: "Used", value: credits?.used_credits ?? 0, icon: <Sparkles className="w-4 h-4 text-secondary" />, color: "hsl(270,95%,65%)" },
                { label: "Remaining", value: credits?.remaining ?? 0, icon: <Crown className="w-4 h-4 text-accent" />, color: "hsl(177,100%,39%)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4 border transition-all duration-300"
                  style={{
                    background: "hsl(240,15%,10%,0.6)",
                    borderColor: "hsl(0,0%,100%,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <Button variant="hero" size="sm" className="gap-2" asChild>
              <a href="/dashboard/upgrade">
                <Crown className="w-4 h-4" /> Upgrade Plan
              </a>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

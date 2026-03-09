import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, CreditCard, Palette, Sparkles, Zap, Crown, AlertTriangle, Globe, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { changeLanguage, LANGUAGES } from "@/i18n/i18n";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const { t, i18n } = useTranslation();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [clipLength, setClipLength] = useState("medium");
  const [clipCount, setClipCount] = useState("10");
  const [reframeMode, setReframeMode] = useState("smart");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_credits")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(() => { setLoadingPrefs(false); });
    const meta = user?.user_metadata || {};
    if (meta.caption_style) setCaptionStyle(meta.caption_style);
    if (meta.clip_length) setClipLength(meta.clip_length);
    if (meta.clip_count) setClipCount(meta.clip_count);
    setLoadingPrefs(false);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) { toast.error(t("settings.failedSaveProfile")); } else { toast.success(t("toasts.changesSaved")); }
    setSavingProfile(false);
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await supabase.auth.updateUser({
      data: { caption_style: captionStyle, clip_length: clipLength, clip_count: clipCount },
    });
    if (error) { toast.error(t("settings.failedSavePrefs")); } else { toast.success(t("toasts.changesSaved")); }
    setSavingPrefs(false);
  };

  return (
    <div className="p-6 lg:p-8 w-full animate-fade-in" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="profile" className="max-w-2xl">
        <TabsList className="mb-6 bg-muted/20 border border-border/30 backdrop-blur-sm w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <User className="w-4 h-4" />
            {t("settings.profile")}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <Palette className="w-4 h-4" />
            {t("settings.defaults")}
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <CreditCard className="w-4 h-4" />
            {t("settings.plan")}
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
            <Globe className="w-4 h-4" />
            {t("language.selectLanguage")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-foreground text-lg">{t("settings.profileInformation")}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="settingsName" className="text-sm text-foreground/80">{t("settings.fullName")}</Label>
                <Input
                  id="settingsName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label className="text-sm text-foreground/80">{t("settings.email")}</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="mt-1.5 bg-muted/10 border-border/30 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">{t("settings.emailCannotChange")}</p>
              </div>
              <Button variant="hero" size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? t("settings.saving") : t("settings.saveChanges")}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl p-6 space-y-4" style={{ border: "1px solid hsl(0,62%,50%,0.3)", background: "hsl(0,62%,50%,0.04)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-foreground">{t("settings.dangerZone")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t("settings.dangerDesc")}</p>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => toast.info(t("settings.deleteAccountMsg"))}
            >
              {t("settings.deleteAccount")}
            </Button>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h3 className="font-semibold text-foreground text-lg">{t("settings.defaultAnalysis")}</h3>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">{t("settings.defaultCaptionStyle")}</Label>
              <Select value={captionStyle} onValueChange={setCaptionStyle}>
                <SelectTrigger className="bg-muted/20 border-border/40 text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="hormozi">{t("settings.hormoziDesc")}</SelectItem>
                  <SelectItem value="mrbeast">{t("settings.mrBeastDesc")}</SelectItem>
                  <SelectItem value="minimal">{t("settings.minimalDesc")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">{t("settings.defaultClipLength")}</Label>
              <Select value={clipLength} onValueChange={setClipLength}>
                <SelectTrigger className="bg-muted/20 border-border/40 text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="short">{t("videoConfig.short")} (15–30s)</SelectItem>
                  <SelectItem value="medium">{t("videoConfig.medium")} (30–60s)</SelectItem>
                  <SelectItem value="long">{t("videoConfig.long")} (60–90s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground/80">{t("settings.defaultClipCount")}</Label>
              <Select value={clipCount} onValueChange={setClipCount}>
                <SelectTrigger className="bg-muted/20 border-border/40 text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="5">{t("settings.nClips", { count: 5 })}</SelectItem>
                  <SelectItem value="10">{t("settings.nClips", { count: 10 })}</SelectItem>
                  <SelectItem value="15">{t("settings.nClips", { count: 15 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="hero" size="sm" onClick={handleSavePrefs} disabled={savingPrefs || loadingPrefs}>
              {savingPrefs ? t("settings.saving") : t("settings.savePreferences")}
            </Button>
          </div>
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">{t("settings.currentPlan")}</h3>
              <Badge className="bg-muted/30 text-muted-foreground border border-border/30 font-medium capitalize">
                {credits?.plan || "Free"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.planDescription", { plan: credits?.plan || "free" })}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t("settings.totalCredits"), value: credits?.total_credits ?? 0, icon: <Zap className="w-4 h-4 text-primary" /> },
                { label: t("settings.used"), value: credits?.used_credits ?? 0, icon: <Sparkles className="w-4 h-4 text-secondary" /> },
                { label: t("settings.remaining"), value: credits?.remaining ?? 0, icon: <Crown className="w-4 h-4 text-accent" /> },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4 border transition-all duration-300" style={{ background: "hsl(240,15%,10%,0.6)", borderColor: "hsl(0,0%,100%,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <Button variant="hero" size="sm" className="gap-2" asChild>
              <a href="/dashboard/upgrade"><Crown className="w-4 h-4" /> {t("settings.upgradePlan")}</a>
            </Button>
          </div>
        </TabsContent>

        {/* Language Tab */}
        <TabsContent value="language">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">{t("language.selectLanguage")}</h3>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    i18n.language === lang.code
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/30 hover:border-border/60 hover:bg-muted/10"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-foreground">{lang.name}</span>
                  <span className="text-sm text-muted-foreground ml-1">({lang.label})</span>
                  {i18n.language === lang.code && (
                    <span className="ml-auto text-primary text-sm font-semibold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Support */}
      <div className="max-w-2xl glass-card rounded-2xl p-6 space-y-3 mt-6">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">{t("common.support")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("common.supportDesc")}
        </p>
        <a
          href="mailto:support@hookcut.com"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm hover:bg-primary/10 transition-colors"
        >
          <Mail className="w-4 h-4" />
          support@hookcut.com
        </a>
      </div>

      {/* Sign Out */}
      <div className="max-w-2xl pt-6 mt-6 border-t border-border/50">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

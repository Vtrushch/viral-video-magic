import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Palette, Sparkles, Zap, Crown } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");

  return (
    <div className="p-6 lg:p-8 w-full" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, plan, and brand preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 bg-muted/20 border border-border/30 backdrop-blur-sm">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground">
            <CreditCard className="w-4 h-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2 data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground">
            <Palette className="w-4 h-4" />
            Brand
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
                  className="mt-1.5 max-w-sm bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label className="text-sm text-foreground/80">Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="mt-1.5 max-w-sm bg-muted/10 border-border/30 text-muted-foreground"
                />
              </div>
              <Button variant="hero" size="sm">Save Changes</Button>
            </div>
          </div>
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">Current Plan</h3>
              <Badge className="bg-muted/30 text-muted-foreground border border-border/30 font-medium">Free</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              You're on the free plan. Upgrade to unlock more features and higher limits.
            </p>

            {/* Usage Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Videos", used: 0, total: 2, icon: <Zap className="w-4 h-4 text-primary" /> },
                { label: "Clips", used: 0, total: 10, icon: <Sparkles className="w-4 h-4 text-accent" /> },
                { label: "Storage", used: "0 MB", total: "500 MB", icon: <Crown className="w-4 h-4 text-secondary" /> },
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
                  <p className="text-lg font-bold text-foreground">
                    {typeof stat.used === "number" ? `${stat.used}/${stat.total}` : stat.used}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <Button variant="hero" size="sm" className="gap-2">
              <Crown className="w-4 h-4" /> Upgrade Plan
            </Button>
          </div>
        </TabsContent>

        {/* Brand Tab */}
        <TabsContent value="brand" className="space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground text-lg">Brand Profiles</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full gradient-bg text-primary-foreground">Coming Soon</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create custom brand voices, color schemes, and caption styles for consistent content across all your channels.
            </p>
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: "hsl(177,100%,39%,0.06)", border: "1px solid hsl(177,100%,39%,0.15)" }}
            >
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent/80">
                <strong className="text-accent">Pro feature:</strong> Define your brand's tone, colors, and caption style once — apply everywhere.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

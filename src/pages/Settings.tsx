import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Palette } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2">
            <Palette className="w-4 h-4" />
            Brand
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="settingsName">Full Name</Label>
                <Input
                  id="settingsName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 max-w-sm"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1.5 max-w-sm" />
              </div>
              <Button variant="hero" size="sm">Save Changes</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Current Plan</h3>
              <Badge className="bg-muted text-muted-foreground border-0">Free</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You're on the free plan. Upgrade to unlock more features.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">0/2</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">0/10</p>
                <p className="text-xs text-muted-foreground">Clips</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">0 MB</p>
                <p className="text-xs text-muted-foreground">Storage</p>
              </div>
            </div>
            <Button variant="hero" size="sm">Upgrade Plan</Button>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold">Brand Profiles</h3>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Create custom brand voices, color schemes, and caption styles for consistent content across all your channels.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

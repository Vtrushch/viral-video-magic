import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useCredits } from "@/hooks/useCredits";
import {
  Scissors, Video, Film, BarChart3, Settings, CreditCard, LogOut, ChevronLeft, ChevronRight, Shield, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: Video, label: "Videos", path: "/dashboard" },
  { icon: Film, label: "Clips", path: "/dashboard/clips" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  { icon: CreditCard, label: "Upgrade", path: "/dashboard/upgrade" },
];

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { credits } = useCredits();
  const location = useLocation();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "linear-gradient(180deg, #1A1A2E 0%, #16162A 100%)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 0 20px rgba(255,45,85,0.3)" }}>
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold" style={{ color: "#E5E5E5" }}>
              CutViral<span className="text-primary">.ai</span>
            </span>
          )}
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {isAdmin && (
          <Link
            to="/dashboard/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-2",
              location.pathname === "/dashboard/admin"
                ? "font-medium"
                : "hover:bg-white/5"
            )}
            style={location.pathname === "/dashboard/admin" ? { background: "linear-gradient(135deg, rgba(255,45,85,0.2), rgba(94,92,230,0.2))", color: "#fff" } : { color: "#FF2D55" }}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "font-medium"
                  : "hover:bg-white/5"
              )}
              style={isActive ? { background: "linear-gradient(135deg, rgba(255,45,85,0.2), rgba(94,92,230,0.2))", color: "#fff" } : { color: "#E5E5E5" }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      {!collapsed && credits && (
        <div className="mx-2 mb-2 p-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.1), rgba(94,92,230,0.1))", border: "1px solid rgba(255,45,85,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Credits</span>
          </div>
          <p className="text-lg font-bold text-foreground">{credits.remaining}</p>
          <p className="text-[10px] text-muted-foreground">{credits.used_credits} used of {credits.total_credits}</p>
        </div>
      )}
      {collapsed && credits && (
        <div className="mx-2 mb-2 flex flex-col items-center">
          <Sparkles className="w-4 h-4 text-primary mb-1" />
          <span className="text-xs font-bold text-foreground">{credits.remaining}</span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
        style={{ color: "#E5E5E5" }}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,45,85,0.4)" }}>
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium" style={{ color: "#fff" }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "#fff" }}>{displayName}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{user?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn("w-full mt-2 hover:text-destructive", collapsed && "px-0")}
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

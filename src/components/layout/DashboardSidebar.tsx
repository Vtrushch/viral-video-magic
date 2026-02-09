import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Scissors, Video, Film, BarChart3, Settings, CreditCard, LogOut, ChevronLeft, ChevronRight,
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
  const location = useLocation();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground">
              CutViral<span className="text-primary">.ai</span>
            </span>
          )}
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-2 p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-sidebar-foreground">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn("w-full mt-2 text-muted-foreground hover:text-destructive", collapsed && "px-0")}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useCredits } from "@/hooks/useCredits";
import {
  Scissors, Video, Film, BarChart3, Settings, CreditCard, LogOut, ChevronLeft, ChevronRight, Shield, Sparkles, Globe, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { changeLanguage, LANGUAGES } from "@/i18n/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { credits } = useCredits();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const menuItems = [
    { icon: Video, label: t("nav.videos"), path: "/dashboard" },
    { icon: Film, label: t("nav.clips"), path: "/dashboard/clips" },
    { icon: BarChart3, label: t("nav.analytics"), path: "/dashboard/analytics" },
    { icon: Settings, label: t("nav.settings"), path: "/dashboard/settings" },
    { icon: CreditCard, label: t("nav.upgrade"), path: "/dashboard/upgrade" },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatar = user?.user_metadata?.avatar_url;
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "sticky top-0 h-screen flex-col border-r transition-all duration-300 hidden md:flex",
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
                Hook<span className="text-primary">Cut</span>
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
                location.pathname === "/dashboard/admin" ? "font-medium" : "hover:bg-white/5"
              )}
              style={location.pathname === "/dashboard/admin" ? { background: "linear-gradient(135deg, rgba(255,45,85,0.2), rgba(94,92,230,0.2))", color: "#fff" } : { color: "#FF2D55" }}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{t("nav.admin")}</span>}
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
                  isActive ? "font-medium" : "hover:bg-white/5"
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
              <span className="text-xs font-semibold text-foreground">Render Credits</span>
            </div>
            <p className="text-lg font-bold text-foreground">{credits.remaining}</p>
            <p className="text-[10px] text-muted-foreground">{credits.remaining} of {credits.total_credits} remaining</p>
            {/* Progress bar */}
            <div className="h-1.5 bg-border/50 rounded-full mt-2 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  credits.remaining <= 3 ? "bg-destructive" : credits.remaining <= 10 ? "bg-yellow-500" : "bg-primary"
                )}
                style={{ width: `${credits.total_credits > 0 ? (credits.remaining / credits.total_credits) * 100 : 0}%` }}
              />
            </div>
            {credits.remaining <= 5 && (
              <Link to="/dashboard/upgrade" className="text-[10px] text-primary hover:underline mt-1 block">
                {credits.remaining === 0 ? "Upgrade for more credits →" : "Running low — upgrade →"}
              </Link>
            )}
          </div>
        )}
        {collapsed && credits && (
          <div className="mx-2 mb-2 flex flex-col items-center">
            <Sparkles className="w-4 h-4 text-primary mb-1" />
            <span className={cn(
              "text-xs font-bold",
              credits.remaining <= 3 ? "text-destructive" : credits.remaining <= 10 ? "text-yellow-500" : "text-foreground"
            )}>{credits.remaining}</span>
          </div>
        )}

        {/* Language Switcher */}
        {!collapsed && (
          <div className="mx-2 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{currentLang.flag} {currentLang.label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start" side="top">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/30",
                      i18n.language === lang.code ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                    )}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {i18n.language === lang.code && <span className="ml-auto text-[10px] text-primary">✓</span>}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}
        {collapsed && (
          <div className="mx-2 mb-2 flex justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                  title={t("language.selectLanguage")}
                >
                  <span className="text-base">{currentLang.flag}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start" side="right">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/30",
                      i18n.language === lang.code ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                    )}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {i18n.language === lang.code && <span className="ml-auto text-[10px] text-primary">✓</span>}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Help & Support */}
        {!collapsed && (
          <a
            href="mailto:support@hookcut.com"
            className="flex items-center gap-2 mx-2 mb-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Help & Support
          </a>
        )}
        {collapsed && (
          <a
            href="mailto:support@hookcut.com"
            className="mx-2 mb-1 p-2 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title="Help & Support"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </a>
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
            {!collapsed && <span className="ml-2">{t("nav.signOut")}</span>}
          </Button>
        </div>
      </aside>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t"
        style={{
          background: "linear-gradient(180deg, #1A1A2E 0%, #16162A 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { icon: Video, label: t("nav.videos"), path: "/dashboard" },
          { icon: Film, label: t("nav.clips"), path: "/dashboard/clips" },
          { icon: BarChart3, label: t("nav.analytics"), path: "/dashboard/analytics" },
          { icon: Settings, label: t("nav.settings"), path: "/dashboard/settings" },
          { icon: CreditCard, label: t("nav.upgrade"), path: "/dashboard/upgrade" },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all min-h-[56px] relative"
              style={{ color: isActive ? "hsl(349,100%,59%)" : "rgba(255,255,255,0.5)" }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default DashboardSidebar;

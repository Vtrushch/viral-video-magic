import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { changeLanguage, LANGUAGES } from "@/i18n/i18n";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold group">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center transition-shadow duration-300 group-hover:glow-primary">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-foreground">
            Hook<span className="gradient-text">Cut</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{t('landing.nav.howItWorks')}</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{t('landing.nav.features')}</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{t('landing.nav.pricing')}</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Language Switcher */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors uppercase tracking-wide">
                {currentLang.label}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${
                    i18n.language === lang.code ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
            {t('landing.nav.signIn')}
          </Link>
          <Button variant="hero" size="sm" asChild>
            <Link to="/auth">{t('landing.nav.getStarted')}</Link>
          </Button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-2xl px-6 py-4 space-y-3 animate-fade-in">
          <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{t('landing.nav.howItWorks')}</a>
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{t('landing.nav.features')}</a>
          <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{t('landing.nav.pricing')}</a>
          {/* Mobile language switcher */}
          <div className="flex gap-2 pt-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { changeLanguage(lang.code); setMobileOpen(false); }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  i18n.language === lang.code ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{t('landing.nav.signIn')}</Link>
            <Button variant="hero" size="sm" asChild><Link to="/auth" onClick={() => setMobileOpen(false)}>{t('landing.nav.getStarted')}</Link></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

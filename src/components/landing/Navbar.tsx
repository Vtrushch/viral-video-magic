import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold group">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center transition-shadow duration-300 group-hover:glow-primary">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-foreground">
            CutViral<span className="gradient-text">.ai</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">How it works</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/auth">Get Started</Link>
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
          <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign In</Link></Button>
            <Button variant="hero" size="sm" asChild><Link to="/auth">Get Started</Link></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          CutViral<span className="text-primary">.ai</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

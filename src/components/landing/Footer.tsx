import { Link } from "react-router-dom";
import { Scissors, Twitter, Github, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-primary-foreground" />
              </div>
              CutViral<span className="text-primary">.ai</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered video repurposing. Turn long videos into viral short clips automatically.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><span className="opacity-50">API</span></li>
                <li><span className="opacity-50">Blog</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="opacity-50">Terms</span></li>
                <li><span className="opacity-50">Privacy</span></li>
                <li><span className="opacity-50">About</span></li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <a href="#" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CutViral.ai. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const LANGS = ["en", "uk", "es"] as const;
const LABELS: Record<string, string> = { en: "English", uk: "Українська", es: "Español" };

/**
 * "Watch Demo" lightbox — silent product tour whose subtitles auto-select from
 * the viewer's browser language (en/uk/es, falls back to English), with a manual
 * language toggle. Assets live in /public/demo (same-origin so the <track>s load).
 */
const DemoVideoModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lang, setLang] = useState<string>("en");

  const pickLang = () => {
    const prefs = (navigator.languages || [navigator.language || "en"]).map((l) => (l || "").slice(0, 2).toLowerCase());
    for (const p of prefs) if ((LANGS as readonly string[]).includes(p)) return p;
    return "en";
  };

  const applyLang = (code: string) => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = tracks[i].language === code ? "showing" : "disabled";
    }
    setLang(code);
  };

  // Text tracks need a tick to attach; poll briefly then apply the browser language.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && v.textTracks.length) {
        applyLang(pickLang());
        clearInterval(id);
      }
    }, 50);
    return () => clearInterval(id);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[94vw] p-0 overflow-hidden bg-background border-border">
        <DialogTitle className="sr-only">HookCut product tour</DialogTitle>
        <video
          ref={videoRef}
          src="/demo/tutorial.mp4"
          controls
          autoPlay
          muted
          playsInline
          preload="auto"
          className="w-full block bg-black rounded-t-lg"
        >
          <track kind="subtitles" src="/demo/tutorial.en.vtt" srcLang="en" label="English" default />
          <track kind="subtitles" src="/demo/tutorial.uk.vtt" srcLang="uk" label="Українська" />
          <track kind="subtitles" src="/demo/tutorial.es.vtt" srcLang="es" label="Español" />
        </video>
        <div className="flex gap-2 justify-center py-3">
          {LANGS.map((code) => (
            <button
              key={code}
              onClick={() => applyLang(code)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                lang === code
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {LABELS[code]}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoVideoModal;

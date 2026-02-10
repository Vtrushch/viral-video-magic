import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const clipCountOptions = [5, 10, 15];
const clipLengthOptions = [
  { value: "short", label: "Short", desc: "15–30s" },
  { value: "medium", label: "Medium", desc: "30–60s" },
  { value: "long", label: "Long", desc: "60–90s" },
];
const captionStyles = [
  { value: "hormozi", label: "Hormozi", desc: "Bold, high-energy captions" },
  { value: "mrbeast", label: "MrBeast", desc: "Animated, attention-grabbing" },
  { value: "minimal", label: "Minimal", desc: "Clean, subtle text" },
];
const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
];

const VideoConfig = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Tables<"videos"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [clipCount, setClipCount] = useState(10);
  const [clipLength, setClipLength] = useState("medium");
  const [captionStyle, setCaptionStyle] = useState("hormozi");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["en"]);
  const [includeTranscription, setIncludeTranscription] = useState(true);
  const [includeChapters, setIncludeChapters] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("videos").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setVideo(data);
      setLoading(false);
    });
  }, [id]);

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  };

  const handleStartAnalysis = async () => {
    if (!id) return;
    setSubmitting(true);
    const settings = {
      clipCount,
      clipLength,
      captionStyle,
      languages: selectedLangs,
      includeTranscription,
      includeChapters,
    };

    const { error } = await supabase
      .from("videos")
      .update({ status: "analyzing", settings } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to start analysis");
      setSubmitting(false);
      return;
    }

    toast.success("Analysis started! AI is processing your video.");
    navigate(`/dashboard/videos/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.5)" }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "rgba(255,255,255,0.5)" }}>
        <p>Video not found</p>
        <Button variant="ghost" asChild><Link to="/dashboard">Back</Link></Button>
      </div>
    );
  }

  const optionBtn = (active: boolean) =>
    `px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
      active
        ? "border-primary/50 text-white"
        : "border-transparent text-white/60 hover:text-white/80"
    }`;

  const optionBg = (active: boolean) =>
    active
      ? "linear-gradient(135deg, rgba(255,45,85,0.15), rgba(94,92,230,0.15))"
      : "rgba(255,255,255,0.04)";

  return (
    <div className="p-6 lg:p-8 max-w-3xl" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm hover:text-foreground mb-6 transition-colors"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to videos
      </Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: "#fff" }}>Configure Analysis</h1>
      <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
        Set your preferences for <span style={{ color: "#fff" }}>{video.title}</span>
      </p>

      <div className="space-y-8">
        {/* Clip Count */}
        <div>
          <Label className="text-sm font-medium mb-3 block" style={{ color: "#E5E5E5" }}>Number of Clips</Label>
          <div className="flex gap-3">
            {clipCountOptions.map((n) => (
              <button
                key={n}
                className={optionBtn(clipCount === n)}
                style={{ background: optionBg(clipCount === n) }}
                onClick={() => setClipCount(n)}
              >
                {n} clips
              </button>
            ))}
          </div>
        </div>

        {/* Clip Length */}
        <div>
          <Label className="text-sm font-medium mb-3 block" style={{ color: "#E5E5E5" }}>Clip Length</Label>
          <div className="flex gap-3">
            {clipLengthOptions.map((opt) => (
              <button
                key={opt.value}
                className={optionBtn(clipLength === opt.value)}
                style={{ background: optionBg(clipLength === opt.value) }}
                onClick={() => setClipLength(opt.value)}
              >
                <div>{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Style */}
        <div>
          <Label className="text-sm font-medium mb-3 block" style={{ color: "#E5E5E5" }}>Caption Style</Label>
          <div className="flex gap-3">
            {captionStyles.map((opt) => (
              <button
                key={opt.value}
                className={optionBtn(captionStyle === opt.value)}
                style={{ background: optionBg(captionStyle === opt.value) }}
                onClick={() => setCaptionStyle(opt.value)}
              >
                <div>{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <Label className="text-sm font-medium mb-3 block" style={{ color: "#E5E5E5" }}>Languages</Label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={optionBtn(selectedLangs.includes(lang.code))}
                style={{ background: optionBg(selectedLangs.includes(lang.code)) }}
                onClick={() => toggleLang(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTranscription}
              onChange={(e) => setIncludeTranscription(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm" style={{ color: "#E5E5E5" }}>Include Transcription</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeChapters}
              onChange={(e) => setIncludeChapters(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm" style={{ color: "#E5E5E5" }}>Include Chapters</span>
          </label>
        </div>

        {/* Submit */}
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleStartAnalysis}
          disabled={submitting || selectedLangs.length === 0}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Analysis...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Start AI Analysis</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoConfig;

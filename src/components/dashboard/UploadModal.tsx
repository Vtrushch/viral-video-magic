import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileVideo, Link as LinkIcon, Loader2, Sparkles, Search, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const isValidYouTubeUrl = (url: string) =>
  /(?:youtube\.com\/watch|youtu\.be\/)/.test(url);

const UploadModal = ({ open, onClose }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleFileChange = (selectedFile: File) => {
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Unsupported file type. Use MP4, MOV, AVI, or WebM.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(10);

    try {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("raw-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setProgress(70);

      const { data: videoData, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        title: cleanTitle || file.name,
        file_path: fileName,
        file_size: file.size,
        status: "uploaded",
        settings: {
          clipCount: 10,
          clipLength: "medium",
          captionStyle: "hormozi",
          languages: ["en"],
        },
      }).select().single();

      if (dbError) throw dbError;
      setProgress(100);

      toast.success(t("toasts.uploadSuccess"));
      setTimeout(() => {
        handleCancel();
        if (videoData) {
          navigate(`/dashboard/videos/configure/${videoData.id}`);
        }
      }, 300);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  const handleYouTubeImport = async () => {
    if (!user) return;
    if (!isValidYouTubeUrl(youtubeUrl.trim())) {
      toast.error("Invalid YouTube URL. Use a youtube.com/watch or youtu.be/ link.");
      return;
    }

    setImporting(true);
    try {
      const { data: videoData, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        title: "Importing from YouTube...",
        status: "downloading",
        source_url: youtubeUrl.trim(),
        settings: {
          clipCount: 10,
          clipLength: "medium",
          captionStyle: "hormozi",
          languages: ["en"],
        },
      } as any).select().single();

      if (dbError) throw dbError;

      const res = await apiFetch("/youtube-import", {
        youtube_url: youtubeUrl.trim(),
        video_id: videoData.id,
        user_id: user.id,
      });

      if (!res.ok) throw new Error("YouTube import request failed");

      toast.success(t("toasts.youtubeImportStarted"));
      setTimeout(() => {
        handleCancel();
        navigate(`/dashboard/videos/${videoData.id}`);
      }, 300);
    } catch (error: any) {
      console.error("YouTube import error:", error);
      toast.error(error.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setYoutubeUrl("");
    setImporting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="w-full max-w-lg mx-auto dark sm:rounded-2xl rounded-none sm:top-1/2 top-auto bottom-0 translate-y-0 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 fixed">
        <DialogHeader>
          <DialogTitle>{t("upload.addVideo")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-2">
              <Upload className="w-4 h-4" /> {t("upload.uploadFile")}
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex-1 gap-2">
              <LinkIcon className="w-4 h-4" /> {t("upload.youtubeUrl")}
            </TabsTrigger>
          </TabsList>

          {/* Upload File Tab */}
          <TabsContent value="upload">
            {!file ? (
              <div
                className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center transition-all cursor-pointer group ${
                  dragging
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                {/* Background gradient orb */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary/10 blur-3xl transition-opacity opacity-0 group-hover:opacity-100" />
                </div>

                {/* Icon */}
                <div className="relative w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                  <CloudUpload className="w-8 h-8 text-primary" />
                </div>

                <p className="text-base font-semibold mb-1 text-foreground">Drop your video here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>

                {/* Format badges */}
                <div className="flex items-center justify-center flex-wrap gap-2 text-xs">
                  {["MP4", "MOV", "AVI", "WebM"].map(fmt => (
                    <span key={fmt} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-muted-foreground">• up to 2 hours</span>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.webm"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* File card */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    {/* Video icon with gradient bg */}
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                      <FileVideo className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>

                    {!uploading && (
                      <button
                        onClick={() => setFile(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Upload progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="relative h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {progress < 70 ? "Uploading..." : progress < 100 ? "Creating video entry..." : "Done!"}
                        </p>
                        <p className="text-xs font-medium text-foreground">{progress}%</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* What happens next info */}
                {!uploading && (
                  <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-primary/5 border border-primary/15">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      After upload, AI will analyze your video and find the most viral moments — usually takes 1–3 minutes.
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={handleCancel} className="flex-1 min-h-[44px]" disabled={uploading}>
                    {t("upload.cancel")}
                  </Button>
                  <Button variant="hero" onClick={handleUpload} className="flex-1 min-h-[44px]" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upload & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* YouTube URL Tab */}
          <TabsContent value="youtube">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t("upload.pasteYoutubeUrl")}
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={importing}
                    className="h-12 pl-10 text-sm"
                  />
                </div>

                <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-primary/5 border border-primary/15">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste a YouTube link — we'll download and analyze it automatically.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1 min-h-[44px]" disabled={importing}>
                  {t("upload.cancel")}
                </Button>
                <Button
                  variant="hero"
                  onClick={handleYouTubeImport}
                  className="flex-1 min-h-[44px]"
                  disabled={importing || !youtubeUrl.trim()}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Import & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

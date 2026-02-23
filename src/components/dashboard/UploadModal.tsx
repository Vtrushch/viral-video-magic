import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileVideo, Loader2, Sparkles, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { posthog } from "@/lib/posthog";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const UploadModal = ({ open, onClose }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const MAX_FILE_SIZE_BYTES = 5120 * 1024 * 1024; // 5GB

  const uploadFileWithProgress = (
    file: File,
    storagePath: string,
    accessToken: string,
    onProgress: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("POST", `${supabaseUrl}/storage/v1/object/raw-videos/${storagePath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.setRequestHeader("x-upsert", "true");

      xhr.send(file);
    });
  };

  const handleFileChange = (selectedFile: File) => {
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Unsupported file type. Use MP4, MOV, AVI, or WebM.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large (${(selectedFile.size / (1024 * 1024 * 1024)).toFixed(1)}GB). Maximum: 5GB`);
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
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to upload");
        setUploading(false);
        return;
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      posthog.capture('video_upload_started', {
        file_size_mb: Math.round(file.size / (1024 * 1024)),
        source: 'file_upload',
      });

      await uploadFileWithProgress(file, fileName, session.access_token, (percent) => {
        setProgress(percent);
      });

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

      posthog.capture('video_upload_completed', {
        file_size_mb: Math.round(file.size / (1024 * 1024)),
        source: 'file_upload',
      });

      toast.success(t("toasts.uploadSuccess"));
      setTimeout(() => {
        handleCancel();
        if (videoData) {
          navigate(`/dashboard/videos/configure/${videoData.id}`);
        }
      }, 300);
    } catch (error: any) {
      console.error("Upload error:", error);
      posthog.capture('video_upload_failed', {
        error: error.message || "Unknown error",
        source: 'file_upload',
      });
      toast.error(error.message || "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg p-5 gap-4 sm:rounded-2xl fixed sm:relative bottom-0 sm:bottom-auto inset-x-0 sm:inset-x-auto rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>

        {!file ? (
              <div
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group ${
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
                  <span className="text-muted-foreground">• up to 2 hours • max 5GB</span>
                </div>

                <p className="text-[10px] text-muted-foreground/40 mt-3">
                  YouTube import coming soon
                </p>

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
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {progress < 100 ? "Uploading..." : "Processing..."}
                        </span>
                        <span>
                          {progress}%
                          {progress < 100 && file && (
                            <> • {((file.size * progress / 100) / (1024 * 1024)).toFixed(0)} / {(file.size / (1024 * 1024)).toFixed(0)} MB</>
                          )}
                        </span>
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
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

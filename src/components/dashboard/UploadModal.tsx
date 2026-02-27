import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileVideo, Loader2, Sparkles, CloudUpload, Youtube, Link2, ArrowRight, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useVideoLimit } from "@/hooks/useVideoLimit";
import { apiFetch } from "@/lib/api";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = "file" | "youtube";

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
    /^https?:\/\/youtu\.be\/[\w-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]{11}/,
    /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]{11}/,
  ];
  return patterns.some((p) => p.test(url.trim()));
}

function extractYouTubeTitle(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return match ? `YouTube Video (${match[1]})` : "YouTube Video";
}

const UploadModal = ({ open, onClose }: UploadModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeImporting, setYoutubeImporting] = useState(false);
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { canUpload, uploadsRemaining, uploadLimit, storageRemaining, storageLimit, activeVideos, plan, loading: limitLoading } = useVideoLimit();

  const MAX_FILE_SIZE_BYTES = 5120 * 1024 * 1024; // 5GB

  useEffect(() => {
    if (!open) return;
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab, open]);

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
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
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
    if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
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
        if (videoData) navigate(`/dashboard/videos/configure/${videoData.id}`);
      }, 300);
    } catch (error: any) {
      console.error("Upload error:", error);
      posthog.capture('video_upload_failed', { error: error.message || "Unknown error", source: 'file_upload' });
      toast.error("Upload failed", { description: "Check your internet connection and try again. Max file size: 5GB." });
      setUploading(false);
      setProgress(0);
    }
  };

  /* ── YouTube Import ── */
  const handleYoutubeImport = async () => {
    if (!user) return;

    const trimmed = youtubeUrl.trim();
    if (!isValidYouTubeUrl(trimmed)) {
      toast.error(t("upload.youtubeInvalidUrl"));
      return;
    }

    setYoutubeImporting(true);

    try {
      // Step 1: Create video record in DB FIRST (status: downloading)
      const tempTitle = extractYouTubeTitle(trimmed);
      const { data: videoData, error: dbError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          title: tempTitle,
          status: "downloading",
          source_url: trimmed,
          settings: {
            clipCount: 10,
            clipLength: "medium",
            captionStyle: "hormozi",
            languages: ["en"],
          },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      posthog.capture('video_upload_started', {
        source: 'youtube',
        youtube_url: trimmed,
      });

      // Step 2: Call backend to start download + analysis
      const res = await apiFetch('/youtube-import', {
        youtube_url: trimmed,
        video_id: videoData.id,
        user_id: user.id,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("YouTube import API error:", errText);
        await supabase.from("videos").update({ status: "failed", error_message: "Import failed" } as any).eq("id", videoData.id);
        throw new Error("Import request failed");
      }

      toast.success(t("upload.youtubeImportStarted"));

      // Step 3: Close modal and navigate to video detail (will show DownloadingState)
      handleCancel();
      navigate(`/dashboard/videos/${videoData.id}`);

    } catch (error: any) {
      console.error("YouTube import error:", error);
      posthog.capture('video_upload_failed', { error: error.message, source: 'youtube' });
      toast.error(t("upload.youtubeImportFailed"));
      setYoutubeImporting(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setYoutubeUrl("");
    setYoutubeImporting(false);
    setCopyrightConfirmed(false);
    onClose();
  };

  /* ── Limit Reached UI ── */
  const renderLimitReached = () => (
    <div className="text-center space-y-3 py-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
        <CloudUpload className="w-7 h-7 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {uploadsRemaining <= 0 ? t("upload.limitReachedTitle") : t("upload.storageFull")}
      </p>
      <p className="text-xs text-muted-foreground">
        {uploadsRemaining <= 0
          ? `Your ${plan} plan allows ${uploadLimit === -1 ? t("upload.unlimited") : uploadLimit} upload${uploadLimit !== 1 ? "s" : ""}/month.`
          : `You have ${activeVideos}/${storageLimit === -1 ? "∞" : storageLimit} videos stored. Delete old videos or upgrade.`}
      </p>
      <a href="/dashboard/upgrade" className="text-xs text-primary hover:underline inline-block">
        {t("upload.upgradeForMore")}
      </a>
    </div>
  );

  /* ── Tab Bar ── */
  const renderTabs = () => (
    <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/30">
      <button
        type="button"
        onClick={() => { if (!uploading && !youtubeImporting) { setActiveTab("file"); setCopyrightConfirmed(false); contentRef.current?.scrollTo({ top: 0 }); } }}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
          activeTab === "file"
            ? "bg-background shadow-sm text-foreground border border-border/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <CloudUpload className="w-4 h-4" />
        {t("upload.tabFile")}
      </button>
      <button
        type="button"
        onClick={() => { if (!uploading && !youtubeImporting) { setActiveTab("youtube"); setCopyrightConfirmed(false); contentRef.current?.scrollTo({ top: 0 }); } }}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
          activeTab === "youtube"
            ? "bg-background shadow-sm text-foreground border border-border/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Youtube className="w-4 h-4" />
        {t("upload.tabYoutube")}
      </button>
    </div>
  );

  /* ── File Upload Tab ── */
  const renderFileTab = () => {
    if (file) {
      return (
        <div className="space-y-3">
          {/* File card */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                <FileVideo className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-full text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              {!uploading && (
                <button onClick={() => setFile(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

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
                  <span>{progress < 100 ? t("upload.uploading") : "Processing..."}</span>
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

          {!uploading && (
            <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-primary/5 border border-primary/15">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{t("upload.afterUploadHint")}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button variant="outline" onClick={handleCancel} className="w-full sm:flex-1 min-h-[44px]" disabled={uploading}>
              {t("upload.cancel")}
            </Button>
            <Button variant="hero" onClick={handleUpload} className="w-full sm:flex-1 min-h-[44px]" disabled={uploading}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("upload.uploading")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{t("upload.uploadAndAnalyze")}</>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
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
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary/10 blur-3xl transition-opacity opacity-0 group-hover:opacity-100" />
          </div>

          <div className="relative w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))", border: "1px solid hsl(var(--primary)/0.3)" }}>
            <CloudUpload className="w-8 h-8 text-primary" />
          </div>

          <p className="text-base font-semibold mb-1 text-foreground">{t("upload.dropVideoHere")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("upload.orClickToBrowse")}</p>

          <div className="flex items-center justify-center flex-wrap gap-2 text-xs">
            {["MP4", "MOV", "AVI", "WebM"].map(fmt => (
              <span key={fmt} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                {fmt}
              </span>
            ))}
            <span className="text-muted-foreground">• {t("upload.upTo2Hours")}</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".mp4,.mov,.avi,.webm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {uploadsRemaining === Infinity ? t("upload.unlimited") : uploadsRemaining} {t("upload.uploadsRemainingLabel")} · {activeVideos}/{storageLimit === -1 ? "∞" : storageLimit} {t("upload.storedLabel")}
        </p>
      </div>
    );
  };

  /* ── YouTube Tab ── */
  const renderYoutubeTab = () => (
    <div className="space-y-4">
      {/* YouTube branding header */}
      <div className="text-center space-y-2 py-2">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-destructive/10 border border-destructive/20">
          <Youtube className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("upload.youtubeImportTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("upload.youtubeImportDesc")}</p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder={t("upload.pasteYoutubeUrl")}
            className="pl-10 h-12 text-base rounded-xl border-border/50 bg-muted/20 focus-visible:border-primary/50"
            disabled={youtubeImporting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && youtubeUrl.trim() && isValidYouTubeUrl(youtubeUrl.trim()) && copyrightConfirmed) handleYoutubeImport();
            }}
          />
        </div>
        {youtubeUrl.trim() && !isValidYouTubeUrl(youtubeUrl.trim()) && (
          <p className="text-xs text-destructive pl-1">{t("upload.youtubeInvalidUrl")}</p>
        )}
      </div>

      {/* Quality tip */}
      <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-muted/40 border border-border/30">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          For best quality, upload your original video file directly via the
          <button
            type="button"
            onClick={() => { setActiveTab("file"); setCopyrightConfirmed(false); contentRef.current?.scrollTo({ top: 0 }); }}
            className="text-primary hover:underline mx-1 font-medium"
          >
            Upload File
          </button>
          tab. YouTube re-encodes videos which may reduce quality.
        </p>
      </div>

      {/* Public videos hint */}
      <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-primary/5 border border-primary/15">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("upload.youtubeImportHint")}</p>
      </div>

      {/* Copyright checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="copyright"
          checked={copyrightConfirmed}
          onCheckedChange={(checked) => setCopyrightConfirmed(checked === true)}
          className="mt-0.5"
          disabled={youtubeImporting}
        />
        <label htmlFor="copyright" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I confirm I have the right to use this video. HookCut is not responsible for copyright violations. Some videos may fail to download due to restrictions set by the uploader.
        </label>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <Button variant="outline" onClick={handleCancel} className="w-full sm:flex-1 min-h-[44px]" disabled={youtubeImporting}>
          {t("upload.cancel")}
        </Button>
        <Button
          variant="hero"
          onClick={handleYoutubeImport}
          className="w-full sm:flex-1 min-h-[44px]"
          disabled={youtubeImporting || !youtubeUrl.trim() || !isValidYouTubeUrl(youtubeUrl.trim()) || !copyrightConfirmed}
        >
          {youtubeImporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("upload.youtubeImportBtnImporting")}</>
          ) : (
            <><ArrowRight className="w-4 h-4 mr-2" />{t("upload.youtubeImportBtnImport")}</>
          )}
        </Button>
      </div>

      {/* Remaining uploads */}
      <p className="text-xs text-muted-foreground text-center">
        {uploadsRemaining === Infinity ? t("upload.unlimited") : uploadsRemaining} {t("upload.uploadsRemainingLabel")}
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg p-5 gap-4 sm:rounded-2xl fixed sm:relative bottom-0 sm:bottom-auto inset-x-0 sm:inset-x-auto rounded-t-2xl sm:rounded-2xl flex flex-col h-[80dvh] sm:h-auto sm:max-h-[85vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("upload.addVideo")}</DialogTitle>
        </DialogHeader>

        {!canUpload && !limitLoading ? (
          renderLimitReached()
        ) : (
          <div className="flex flex-col min-h-0">
            {/* Tabs - fixed at top */}
            {!file && !uploading && !youtubeImporting && (
              <div className="flex-shrink-0 mb-4">
                {renderTabs()}
              </div>
            )}

            {/* Scrollable tab content */}
            <div ref={contentRef} className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
              {activeTab === "file" && renderFileTab()}
              {activeTab === "youtube" && !file && renderYoutubeTab()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileVideo, Link as LinkIcon, Loader2 } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

      toast.success("Video uploaded! Configure your clip settings.");
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

      const res = await fetch("https://vtrushch--cutviral-worker-webhook.modal.run/youtube-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: youtubeUrl.trim(),
          video_id: videoData.id,
          user_id: user.id,
        }),
      });

      if (!res.ok) throw new Error("YouTube import request failed");

      toast.success("YouTube import started!");
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
          <DialogTitle>Add Video</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-2">
              <Upload className="w-4 h-4" /> Upload File
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex-1 gap-2">
              <LinkIcon className="w-4 h-4" /> YouTube URL
            </TabsTrigger>
          </TabsList>

          {/* Upload File Tab */}
          <TabsContent value="upload">
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-10 sm:p-12 text-center transition-colors cursor-pointer ${
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Tap to select or drag & drop</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, AVI, WebM up to 2GB</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.webm"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <FileVideo className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  {!uploading && (
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">{progress}% uploaded</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} className="flex-1 min-h-[44px]" disabled={uploading}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleUpload} className="flex-1 min-h-[44px]" disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* YouTube URL Tab */}
          <TabsContent value="youtube">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Paste YouTube URL here..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={importing}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Supports youtube.com/watch and youtu.be/ links
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1 min-h-[44px]" disabled={importing}>
                  Cancel
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
                    "Import"
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

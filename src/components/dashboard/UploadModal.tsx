import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileVideo } from "lucide-react";
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
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("raw-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setProgress(70);

      const { data: videoData, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_path: fileName,
        file_size: file.size,
        status: "uploading",
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

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg dark">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Drag & drop your video here</p>
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
              <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={uploading}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleUpload} className="flex-1" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

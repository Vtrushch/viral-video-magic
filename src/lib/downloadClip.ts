import { toast } from "sonner";

/**
 * Download or share a video clip.
 * On mobile, uses Web Share API to enable "Save to Photos" on iOS/Android.
 * On desktop, falls back to blob-based download.
 */
export async function downloadClip(url: string, filename: string): Promise<void> {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

  // Mobile: try Web Share API first (enables "Save to Photos" on iOS/Android)
  if (navigator.share && isMobile) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: "video/mp4" });

      await navigator.share({
        files: [file],
        title: filename.replace(".mp4", ""),
      });
      toast.success("Video shared!");
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // User cancelled
      console.log("Share failed, falling back to download:", err);
    }
  }

  // Desktop / fallback: blob-based download
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success("Video saved!");
  } catch {
    toast.error("Failed to download video");
    throw new Error("Download failed");
  }
}

/** Build a standardised filename for a clip */
export function clipFilename(title: string, id: string): string {
  const safe = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "clip";
  return `HookCut_${safe}_${id.slice(0, 6)}.mp4`;
}

import { useEffect, useState } from "react";
import { Loader2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { posthog } from "@/lib/posthog";
import type { Tables } from "@/integrations/supabase/types";

export const POST_PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram Reels" },
  { key: "youtube", label: "YouTube Shorts" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
];

interface SchedulePostDialogProps {
  open: boolean;
  onClose: () => void;
  /** Clip to schedule (for create mode) */
  clip?: { id: string; title: string } | null;
  /** Existing post (for edit mode) */
  post?: Tables<"scheduled_posts"> | null;
  onSaved?: () => void;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0); // tomorrow 6pm local — solid default posting slot
  return toLocalInputValue(d.toISOString());
}

const SchedulePostDialog = ({ open, onClose, clip, post, onSaved }: SchedulePostDialogProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [platform, setPlatform] = useState("tiktok");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue());
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setPlatform(post.platform);
      setScheduledAt(toLocalInputValue(post.scheduled_at));
      setCaption(post.caption || "");
    } else {
      setPlatform("tiktok");
      setScheduledAt(defaultScheduleValue());
      setCaption("");
    }
  }, [open, post]);

  const handleSave = async () => {
    if (!user) return;
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      toast.error(t("calendar.invalidDate"));
      return;
    }
    setSaving(true);
    try {
      if (post) {
        const { error } = await supabase
          .from("scheduled_posts")
          .update({
            platform,
            scheduled_at: when.toISOString(),
            caption: caption.trim() || null,
            // re-arm the reminder if the time moved into the future
            reminder_sent: false,
            status: "scheduled",
          })
          .eq("id", post.id);
        if (error) throw error;
        toast.success(t("calendar.updated"));
      } else {
        const { error } = await supabase.from("scheduled_posts").insert({
          user_id: user.id,
          clip_id: clip?.id || null,
          platform,
          scheduled_at: when.toISOString(),
          caption: caption.trim() || null,
        });
        if (error) throw error;
        posthog.capture("post_scheduled", { platform });
        toast.success(t("calendar.scheduleSuccess"));
      }
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Schedule save error:", err);
      toast.error(t("calendar.scheduleError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-5 gap-4 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            {post ? t("calendar.editPost") : t("calendar.schedulePost")}
          </DialogTitle>
        </DialogHeader>

        {(clip || post) && (
          <p className="text-sm text-muted-foreground truncate">
            🎬 {clip?.title || t("calendar.clip")}
          </p>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("calendar.platform")}</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_PLATFORMS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("calendar.dateTime")}</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("calendar.caption")}</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("calendar.captionPlaceholder")}
              rows={3}
              className="rounded-xl resize-none"
              maxLength={2200}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="w-full sm:flex-1 min-h-[44px]" disabled={saving}>
            {t("upload.cancel")}
          </Button>
          <Button variant="hero" onClick={handleSave} className="w-full sm:flex-1 min-h-[44px] hover:!scale-100" disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("calendar.saving")}</>
            ) : (
              <><CalendarPlus className="w-4 h-4 mr-2" />{post ? t("calendar.saveChanges") : t("calendar.schedule")}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePostDialog;

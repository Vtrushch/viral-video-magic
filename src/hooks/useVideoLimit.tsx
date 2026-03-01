import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PLANS, type PlanKey } from "@/constants/pricing";

export function useVideoLimit() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const [activeVideos, setActiveVideos] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Count active (non-deleted, non-failed) videos
    const { count } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .neq("status", "failed");
    setActiveVideos(count ?? 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, [user]);

  const plan = (credits?.plan?.toLowerCase() || "free") as PlanKey;
  const planData = PLANS[plan] || PLANS.free;
  const storageLimit = planData.maxStorage;
  const canUpload = storageLimit === -1 || activeVideos < storageLimit;
  const storageRemaining = storageLimit === -1 ? Infinity : Math.max(0, storageLimit - activeVideos);

  return {
    activeVideos,
    storageLimit,
    storageRemaining,
    canUpload,
    plan,
    loading: loading || creditsLoading,
    // Legacy aliases
    uploadsThisPeriod: activeVideos,
    uploadLimit: storageLimit,
    uploadsRemaining: storageRemaining,
    videosThisMonth: activeVideos,
    videoLimit: storageLimit,
    videosRemaining: storageRemaining,
    refetch: fetchCounts,
  };
}

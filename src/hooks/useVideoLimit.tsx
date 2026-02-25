import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PLANS, type PlanKey } from "@/constants/pricing";

export function useVideoLimit() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const [uploadsThisPeriod, setUploadsThisPeriod] = useState(0);
  const [activeVideos, setActiveVideos] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Count uploads this period (includes soft-deleted) via RPC
    const { data: rpcCount } = await supabase.rpc("count_uploads_this_period", {
      p_user_id: user.id,
    });
    setUploadsThisPeriod(rpcCount ?? 0);

    // Count active (non-deleted) videos — RLS already filters deleted_at IS NULL
    const { count } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setActiveVideos(count ?? 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, [user]);

  const plan = (credits?.plan?.toLowerCase() || "free") as PlanKey;
  const planData = PLANS[plan] || PLANS.free;
  const uploadLimit = planData.videos;
  const storageLimit = planData.maxStorage;
  const uploadsRemaining = uploadLimit === -1 ? Infinity : Math.max(0, uploadLimit - uploadsThisPeriod);
  const storageRemaining = storageLimit === -1 ? Infinity : Math.max(0, storageLimit - activeVideos);
  const canUpload = (uploadLimit === -1 || uploadsThisPeriod < uploadLimit) &&
                    (storageLimit === -1 || activeVideos < storageLimit);

  return {
    uploadsThisPeriod,
    activeVideos,
    uploadLimit,
    storageLimit,
    uploadsRemaining,
    storageRemaining,
    canUpload,
    plan,
    loading: loading || creditsLoading,
    // Legacy aliases
    videosThisMonth: uploadsThisPeriod,
    videoLimit: uploadLimit,
    videosRemaining: uploadsRemaining,
    refetch: fetchCounts,
  };
}

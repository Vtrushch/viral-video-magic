import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PLANS, type PlanKey } from "@/constants/pricing";

export function useVideoLimit() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const [videosThisMonth, setVideosThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchCount = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      setVideosThisMonth(count ?? 0);
      setLoading(false);
    };
    fetchCount();
  }, [user]);

  const plan = (credits?.plan?.toLowerCase() || "free") as PlanKey;
  const planData = PLANS[plan] || PLANS.free;
  const videoLimit = planData.videos;
  const videosRemaining = videoLimit === -1 ? Infinity : Math.max(0, videoLimit - videosThisMonth);
  const canUpload = videosRemaining > 0;

  return {
    videosThisMonth,
    videoLimit,
    videosRemaining,
    canUpload,
    plan,
    loading: loading || creditsLoading,
    refetch: async () => {
      if (!user) return;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());
      setVideosThisMonth(count ?? 0);
    },
  };
}

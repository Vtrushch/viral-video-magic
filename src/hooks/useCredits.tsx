import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserCredits {
  total_credits: number;
  used_credits: number;
  plan: string;
  remaining: number;
}

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_credits" as any)
      .select("total_credits, used_credits, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const d = data as any;
      setCredits({
        total_credits: d.total_credits,
        used_credits: d.used_credits,
        plan: d.plan,
        remaining: d.total_credits - d.used_credits,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  return { credits, loading, refetch: fetchCredits };
}

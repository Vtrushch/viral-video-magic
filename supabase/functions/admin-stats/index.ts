import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all videos
    const { data: videos } = await adminClient.from("videos").select("id, user_id, title, status, created_at, duration, duration_seconds, file_path, source_url, thumbnail_url");
    // Get all clips
    const { data: clips } = await adminClient.from("clips").select("id, user_id, video_id, title, status, viral_score, start_time, end_time, duration_seconds, caption_style, created_at");
    // Get all profiles
    const { data: profiles } = await adminClient.from("profiles").select("user_id, full_name, avatar_url");
    // Get all credits
    const { data: creditsData } = await adminClient.from("user_credits").select("user_id, total_credits, used_credits, plan");
    // Get all users from auth
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

    // Build user map
    const userMap: Record<string, { email: string; created_at: string; full_name?: string }> = {};
    for (const u of authUsers || []) {
      userMap[u.id] = { email: u.email || u.id, created_at: u.created_at };
    }
    for (const p of profiles || []) {
      if (userMap[p.user_id]) {
        userMap[p.user_id].full_name = p.full_name || undefined;
      }
    }

    // Build credits map
    const creditsMap: Record<string, { total_credits: number; used_credits: number; plan: string }> = {};
    for (const c of creditsData || []) {
      creditsMap[c.user_id] = { total_credits: c.total_credits, used_credits: c.used_credits, plan: c.plan };
    }

    // Build per-user stats
    const userStats: Record<string, { email: string; full_name?: string; joined: string; videos: number; clips: number; rendered: number; total_credits: number; used_credits: number; plan: string }> = {};
    const allUserIds = new Set<string>();
    for (const u of authUsers || []) { allUserIds.add(u.id); }
    for (const v of videos || []) { allUserIds.add(v.user_id); }
    for (const uid of allUserIds) {
      const uVideos = (videos || []).filter(v => v.user_id === uid);
      const uClips = (clips || []).filter(c => c.user_id === uid);
      const cr = creditsMap[uid] || { total_credits: 0, used_credits: 0, plan: "free" };
      userStats[uid] = {
        email: userMap[uid]?.email || uid,
        full_name: userMap[uid]?.full_name,
        joined: userMap[uid]?.created_at || "",
        videos: uVideos.length,
        clips: uClips.length,
        rendered: uClips.filter(c => c.status === "ready").length,
        total_credits: cr.total_credits,
        used_credits: cr.used_credits,
        plan: cr.plan,
      };
    }

    const totalRendered = (clips || []).filter(c => c.status === "ready").length;

    return new Response(JSON.stringify({
      stats: {
        totalUsers: allUserIds.size,
        totalVideos: (videos || []).length,
        totalClips: (clips || []).length,
        totalRendered,
      },
      users: userStats,
      videos: videos || [],
      clips: clips || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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

    const { user_id, plan } = await req.json();
    const validPlans = ["free", "starter", "pro", "agency"];
    if (!user_id || !plan || !validPlans.includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid input. Valid plans: free, starter, pro, agency" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Plan credit allocations
    const planCredits: Record<string, number> = {
      free: 3,
      starter: 30,
      pro: 100,
      agency: 500,
    };

    // Update or create user_credits row
    const { data: existing } = await adminClient.from("user_credits").select("*").eq("user_id", user_id).single();

    if (existing) {
      await adminClient.from("user_credits").update({
        plan: plan,
        total_credits: planCredits[plan],
        used_credits: 0,
      }).eq("user_id", user_id);
    } else {
      await adminClient.from("user_credits").insert({
        user_id,
        plan: plan,
        total_credits: planCredits[plan],
        used_credits: 0,
      });
    }

    // Also update profile plan
    await adminClient.from("profiles").update({ plan: plan }).eq("user_id", user_id);

    return new Response(JSON.stringify({ success: true, plan, credits: planCredits[plan] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

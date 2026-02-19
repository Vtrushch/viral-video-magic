import { supabase } from "@/integrations/supabase/client";

export const API_BASE = "https://vtrushch--cutviral-worker-webhook.modal.run";

/**
 * Authenticated fetch to Modal backend.
 * Automatically adds Supabase JWT token to Authorization header.
 */
export async function apiFetch(endpoint: string, body: Record<string, unknown>): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in.");
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error("Session expired. Please sign in again.");
  }

  return res;
}

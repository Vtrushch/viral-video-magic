import { supabase } from "@/integrations/supabase/client";

export const API_BASE = "https://vtrushch--cutviral-worker-webhook.modal.run";

/**
 * Authenticated fetch to Modal backend with exponential backoff retry.
 * - Retries 3x on network errors and 5xx responses (Modal cold starts)
 * - Does NOT retry on 4xx (auth/validation errors)
 * - Delays: 1s → 2s → 4s
 */
export async function apiFetch(
  endpoint: string,
  body: Record<string, unknown>,
  maxRetries = 3
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in.");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Auth errors: don't retry
      if (res.status === 401) {
        throw new Error("Session expired. Please sign in again.");
      }

      // Client errors (400, 403, 404, 422): don't retry
      if (res.status >= 400 && res.status < 500) {
        return res;
      }

      // Server errors (500, 502, 503, 504): retry
      if (res.status >= 500 && attempt < maxRetries - 1) {
        console.warn(`⚠️ Modal ${endpoint} returned ${res.status}, retrying (${attempt + 1}/${maxRetries})...`);
        lastError = new Error(`Server error: ${res.status}`);
        continue;
      }

      return res;
    } catch (err) {
      // Network error: retry
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        console.warn(`⚠️ Modal ${endpoint} network error, retrying (${attempt + 1}/${maxRetries}):`, lastError.message);
      }
    }
  }

  throw lastError ?? new Error(`Failed to reach ${endpoint} after ${maxRetries} attempts`);
}

import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Get a signed URL for a storage object, with in-memory caching.
 * Returns cached URL if it won't expire for at least 5 minutes.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const cached = cache.get(key);

  // Use cache if URL won't expire for another 5 minutes
  if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) return null;

  cache.set(key, {
    url: data.signedUrl,
    expires: Date.now() + expiresIn * 1000,
  });

  return data.signedUrl;
}

/**
 * Prefetch signed URLs for multiple paths (fire-and-forget).
 */
export function prefetchSignedUrls(bucket: string, paths: (string | null | undefined)[]) {
  paths.forEach((p) => {
    if (p) getSignedUrl(bucket, p);
  });
}

// Link import is intentionally YouTube-only (the backend can fetch more, but we
// only surface + accept YouTube URLs — other platforms go through the Upload File tab).
export const SUPPORTED_PLATFORMS: { key: string; label: string; pattern: RegExp }[] = [
  { key: "youtube", label: "YouTube", pattern: /^https?:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\// },
];

export function detectPlatform(url: string): { key: string; label: string } | null {
  const trimmed = url.trim();
  for (const p of SUPPORTED_PLATFORMS) {
    if (p.pattern.test(trimmed)) return { key: p.key, label: p.label };
  }
  return null;
}

export function isValidImportUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

export function extractTempTitle(url: string): string {
  const platform = detectPlatform(url);
  const ytMatch = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  if (platform?.key === "youtube" && ytMatch) return `YouTube Video (${ytMatch[1]})`;
  return platform ? `${platform.label} Video` : "Imported Video";
}

// Mirrors IMPORT_URL_PATTERNS in modal_worker.py — keep in sync
export const SUPPORTED_PLATFORMS: { key: string; label: string; pattern: RegExp }[] = [
  { key: "youtube", label: "YouTube", pattern: /^https?:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\// },
  { key: "tiktok", label: "TikTok", pattern: /^https?:\/\/((www|vm|vt|m)\.)?tiktok\.com\// },
  { key: "instagram", label: "Instagram", pattern: /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv|share)\// },
  { key: "facebook", label: "Facebook", pattern: /^https?:\/\/((www|m|web)\.)?(facebook\.com|fb\.watch)\// },
  { key: "twitter", label: "X", pattern: /^https?:\/\/((www|mobile)\.)?(twitter\.com|x\.com)\/\w+\/status\// },
  { key: "vimeo", label: "Vimeo", pattern: /^https?:\/\/(www\.)?vimeo\.com\/\d+/ },
  { key: "twitch", label: "Twitch", pattern: /^https?:\/\/(www\.)?twitch\.tv\/videos\/\d+/ },
  { key: "rumble", label: "Rumble", pattern: /^https?:\/\/(www\.)?rumble\.com\// },
  { key: "dailymotion", label: "Dailymotion", pattern: /^https?:\/\/(www\.)?dailymotion\.com\/video\// },
  { key: "loom", label: "Loom", pattern: /^https?:\/\/(www\.)?loom\.com\/share\// },
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

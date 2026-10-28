import { describe, it, expect } from "vitest";
import { detectPlatform, isValidImportUrl, extractTempTitle } from "@/lib/importPlatforms";

describe("detectPlatform", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://www.youtube.com/shorts/abc123DEF45", "youtube"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
  ])("detects %s as %s", (url, expected) => {
    expect(detectPlatform(url)?.key).toBe(expected);
    expect(isValidImportUrl(url)).toBe(true);
  });

  // Link import is intentionally YouTube-only (see importPlatforms.ts). Every other
  // platform — and junk — must be rejected so those URLs are routed to the Upload
  // File tab instead of a link import that would fail.
  it.each([
    "https://www.tiktok.com/@user/video/7301234567890123456",
    "https://vm.tiktok.com/ZMabcdef/",
    "https://vimeo.com/123456789",
    "https://www.twitch.tv/videos/1234567890",
    "https://rumble.com/v4abcd-some-video.html",
    "https://www.dailymotion.com/video/x8abcde",
    "https://www.loom.com/share/abc123def456",
    "https://x.com/user/status/1234567890123456789",
    "https://www.instagram.com/reel/Cxyz123abcd/",
    "https://example.com/video.mp4",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(detectPlatform(url)).toBeNull();
    expect(isValidImportUrl(url)).toBe(false);
  });
});

describe("extractTempTitle", () => {
  it("includes the YouTube video id when present", () => {
    expect(extractTempTitle("https://youtu.be/dQw4w9WgXcQ")).toBe("YouTube Video (dQw4w9WgXcQ)");
    expect(extractTempTitle("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("YouTube Video (dQw4w9WgXcQ)");
  });
  it("uses the platform label when no video id matches", () => {
    // A YouTube URL with no standard 11-char id still reads as YouTube.
    expect(extractTempTitle("https://www.youtube.com/@somechannel")).toBe("YouTube Video");
  });
  it("falls back to a generic title for unsupported URLs", () => {
    expect(extractTempTitle("https://www.tiktok.com/@u/video/123")).toBe("Imported Video");
    expect(extractTempTitle("https://example.com")).toBe("Imported Video");
  });
});

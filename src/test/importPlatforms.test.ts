import { describe, it, expect } from "vitest";
import { detectPlatform, isValidImportUrl, extractTempTitle } from "@/lib/importPlatforms";

describe("detectPlatform", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://www.youtube.com/shorts/abc123DEF45", "youtube"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://www.tiktok.com/@user/video/7301234567890123456", "tiktok"],
    ["https://vm.tiktok.com/ZMabcdef/", "tiktok"],
    ["https://vimeo.com/123456789", "vimeo"],
    ["https://www.twitch.tv/videos/1234567890", "twitch"],
    ["https://rumble.com/v4abcd-some-video.html", "rumble"],
    ["https://www.dailymotion.com/video/x8abcde", "dailymotion"],
    ["https://www.loom.com/share/abc123def456", "loom"],
  ])("detects %s as %s", (url, expected) => {
    expect(detectPlatform(url)?.key).toBe(expected);
  });

  it.each([
    "https://example.com/video.mp4",
    "not a url",
    "https://x.com/user/status/1234567890123456789", // X/Instagram/Facebook no longer supported
    "https://www.instagram.com/reel/Cxyz123abcd/",
    "https://www.twitch.tv/somechannel", // live channel, not a VOD
    "",
  ])("rejects %s", (url) => {
    expect(detectPlatform(url)).toBeNull();
    expect(isValidImportUrl(url)).toBe(false);
  });
});

describe("extractTempTitle", () => {
  it("includes YouTube video id", () => {
    expect(extractTempTitle("https://youtu.be/dQw4w9WgXcQ")).toBe("YouTube Video (dQw4w9WgXcQ)");
  });
  it("uses platform label for others", () => {
    expect(extractTempTitle("https://www.tiktok.com/@u/video/123")).toBe("TikTok Video");
  });
  it("falls back for unknown", () => {
    expect(extractTempTitle("https://example.com")).toBe("Imported Video");
  });
});

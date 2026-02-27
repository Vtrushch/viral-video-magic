export interface SubtitleStyleShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface SubtitleStyle {
  presetId: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fade-in' | 'pop-up' | 'typewriter' | 'bounce' | 'karaoke-highlight' | 'glow-pulse';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  letterSpacing: number;
  lineHeight: number;
  maxWordsPerLine: number;
  shadow: SubtitleStyleShadow;
}

export interface SubtitlePreset extends SubtitleStyle {
  name: string;
  description: string;
  tags: string[];
}

export const SUBTITLE_PRESETS: SubtitlePreset[] = [
  {
    presetId: "bold-pop",
    name: "Bold Pop",
    description: "The #1 viral TikTok style — bold pop-up with gold highlights",
    tags: ["trending", "tiktok", "default"],
    fontFamily: "Montserrat",
    fontSize: 36,
    fontWeight: 800,
    textColor: "#FFFFFF",
    highlightColor: "#FFD700",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "#000000",
    strokeWidth: 3,
    position: "bottom",
    animation: "pop-up",
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 1.2,
    maxWordsPerLine: 4,
    shadow: { enabled: true, color: "#000000", blur: 8, offsetX: 0, offsetY: 2 },
  },
  {
    presetId: "karaoke-neon",
    name: "Karaoke Neon",
    description: "Viral karaoke-style with neon green glow highlights",
    tags: ["karaoke", "neon", "music"],
    fontFamily: "Poppins",
    fontSize: 34,
    fontWeight: 700,
    textColor: "#FFFFFF",
    highlightColor: "#00FF88",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "#000000",
    strokeWidth: 2,
    position: "center",
    animation: "karaoke-highlight",
    textTransform: "none",
    letterSpacing: 0.5,
    lineHeight: 1.2,
    maxWordsPerLine: 5,
    shadow: { enabled: true, color: "#00FF88", blur: 20, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "minimal-clean",
    name: "Minimal Clean",
    description: "Soft, minimalist — perfect for lifestyle & ASMR content",
    tags: ["minimal", "clean", "lifestyle"],
    fontFamily: "Inter",
    fontSize: 28,
    fontWeight: 500,
    textColor: "#FFFFFF",
    highlightColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.6,
    strokeColor: "transparent",
    strokeWidth: 0,
    position: "bottom",
    animation: "fade-in",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.3,
    maxWordsPerLine: 6,
    shadow: { enabled: false, color: "#000000", blur: 0, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "fire-highlight",
    name: "Fire Highlight",
    description: "Energetic orange-red — motivational & fitness content",
    tags: ["fire", "energy", "fitness"],
    fontFamily: "Rubik",
    fontSize: 38,
    fontWeight: 900,
    textColor: "#FFFFFF",
    highlightColor: "#FF4500",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "#000000",
    strokeWidth: 3,
    position: "center",
    animation: "bounce",
    textTransform: "uppercase",
    letterSpacing: 2,
    lineHeight: 1.2,
    maxWordsPerLine: 3,
    shadow: { enabled: true, color: "#FF4500", blur: 15, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "soft-glow",
    name: "Soft Glow",
    description: "Dreamy purple glow — aesthetic, travel & ASMR",
    tags: ["glow", "aesthetic", "dreamy"],
    fontFamily: "Quicksand",
    fontSize: 30,
    fontWeight: 600,
    textColor: "#FFFFFF",
    highlightColor: "#C084FC",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "transparent",
    strokeWidth: 0,
    position: "bottom",
    animation: "glow-pulse",
    textTransform: "none",
    letterSpacing: 1,
    lineHeight: 1.3,
    maxWordsPerLine: 5,
    shadow: { enabled: true, color: "#C084FC", blur: 25, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "yellow-box",
    name: "Yellow Box",
    description: "Boxed captions with yellow accent — classic info/news style",
    tags: ["box", "news", "readable"],
    fontFamily: "Roboto",
    fontSize: 30,
    fontWeight: 700,
    textColor: "#000000",
    highlightColor: "#000000",
    backgroundColor: "#FFD700",
    backgroundOpacity: 0.95,
    strokeColor: "transparent",
    strokeWidth: 0,
    position: "bottom",
    animation: "fade-in",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.3,
    maxWordsPerLine: 6,
    shadow: { enabled: false, color: "#000000", blur: 0, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "comic-bounce",
    name: "Comic Bounce",
    description: "Fun & playful — MrBeast-inspired entertainment style",
    tags: ["fun", "comic", "mrbeast"],
    fontFamily: "Bangers",
    fontSize: 40,
    fontWeight: 400,
    textColor: "#FFFF00",
    highlightColor: "#FF1493",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "#000000",
    strokeWidth: 4,
    position: "center",
    animation: "bounce",
    textTransform: "uppercase",
    letterSpacing: 2,
    lineHeight: 1.2,
    maxWordsPerLine: 3,
    shadow: { enabled: true, color: "#000000", blur: 0, offsetX: 3, offsetY: 3 },
  },
  {
    presetId: "typewriter",
    name: "Typewriter",
    description: "Retro terminal — storytelling, suspense & documentary",
    tags: ["retro", "typewriter", "documentary"],
    fontFamily: "Space Mono",
    fontSize: 26,
    fontWeight: 400,
    textColor: "#00FF00",
    highlightColor: "#00FF00",
    backgroundColor: "#000000",
    backgroundOpacity: 0.8,
    strokeColor: "transparent",
    strokeWidth: 0,
    position: "bottom",
    animation: "typewriter",
    textTransform: "none",
    letterSpacing: 1,
    lineHeight: 1.4,
    maxWordsPerLine: 7,
    shadow: { enabled: false, color: "#000000", blur: 0, offsetX: 0, offsetY: 0 },
  },
  {
    presetId: "gradient-wave",
    name: "Gradient Wave",
    description: "Modern gradient text — tech & creative content",
    tags: ["gradient", "modern", "tech"],
    fontFamily: "Outfit",
    fontSize: 34,
    fontWeight: 700,
    textColor: "#38BDF8",
    highlightColor: "#F472B6",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    strokeColor: "#1E293B",
    strokeWidth: 2,
    position: "center",
    animation: "pop-up",
    textTransform: "none",
    letterSpacing: 0.5,
    lineHeight: 1.2,
    maxWordsPerLine: 4,
    shadow: { enabled: true, color: "#0F172A", blur: 12, offsetX: 0, offsetY: 2 },
  },
  {
    presetId: "classic-white",
    name: "Classic White",
    description: "Simple, universal — always works on any content",
    tags: ["classic", "simple", "universal"],
    fontFamily: "Roboto",
    fontSize: 28,
    fontWeight: 500,
    textColor: "#FFFFFF",
    highlightColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
    strokeColor: "transparent",
    strokeWidth: 0,
    position: "bottom",
    animation: "none",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.3,
    maxWordsPerLine: 7,
    shadow: { enabled: false, color: "#000000", blur: 0, offsetX: 0, offsetY: 0 },
  },
];

export const DEFAULT_PRESET_ID = "bold-pop";

export function getPresetById(id: string): SubtitlePreset | undefined {
  return SUBTITLE_PRESETS.find(p => p.presetId === id);
}

export function getDefaultStyle(): SubtitleStyle {
  const preset = getPresetById(DEFAULT_PRESET_ID)!;
  const { name, description, tags, ...style } = preset;
  return style;
}

export function loadGoogleFont(fontFamily: string) {
  const href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
}

export function loadAllPresetFonts() {
  const uniqueFonts = [...new Set(SUBTITLE_PRESETS.map(p => p.fontFamily))];
  uniqueFonts.forEach(loadGoogleFont);
}

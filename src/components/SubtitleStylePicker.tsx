import { useState, useEffect } from "react";
import { Check, ChevronDown, RotateCcw, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SUBTITLE_PRESETS,
  type SubtitleStyle,
  type SubtitlePreset,
} from "@/config/subtitlePresets";

interface SubtitleStylePickerProps {
  value: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  subtitleSize?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}

const QUICK_COLORS = [
  "#FFFFFF", "#000000", "#FFD700", "#FF4500",
  "#3B82F6", "#10B981", "#FF1493", "#FF8C00",
];

const ANIMATION_OPTIONS: { value: SubtitleStyle["animation"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade In" },
  { value: "pop-up", label: "Pop Up" },
  { value: "typewriter", label: "Typewriter" },
  { value: "bounce", label: "Bounce" },
  { value: "karaoke-highlight", label: "Karaoke" },
  { value: "glow-pulse", label: "Glow" },
];

export default function SubtitleStylePicker({ value, onChange, subtitleSize = "medium", onSizeChange }: SubtitleStylePickerProps) {
  const isMobile = useIsMobile();
  const [customizeOpen, setCustomizeOpen] = useState(false); // collapsed by default (desktop & mobile)
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const applyPreset = (preset: SubtitlePreset) => {
    const { name, description, tags, ...style } = preset;
    onChange(style);
  };

  const update = (partial: Partial<SubtitleStyle>) => {
    onChange({ ...value, ...partial });
  };

  const resetToPreset = () => {
    const preset = SUBTITLE_PRESETS.find(p => p.presetId === value.presetId);
    if (preset) applyPreset(preset);
  };

  const animLabel = value.animation !== "none" ? value.animation.replace("-", " ") : "No anim";
  const summaryText = `${animLabel} · ${value.fontSize}px · ${value.position}`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Subtitle Style
      </h3>

      {/* Preset strip — single-row horizontal scroll on mobile, 2-row grid on desktop */}
      <div className="relative">
        <div className={cn(
          "overflow-x-auto pb-2 scrollbar-hide snap-x",
          isMobile
            ? "flex gap-2"
            : "grid grid-rows-2 grid-flow-col auto-cols-[110px] gap-2"
        )}>
          {SUBTITLE_PRESETS.map((preset) => {
            const isSelected = value.presetId === preset.presetId;
            return (
              <button
                key={preset.presetId}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "relative snap-start rounded-lg p-2 text-left transition-all duration-200 flex-shrink-0",
                  isMobile ? "w-[100px]" : "",
                  isSelected
                    ? "ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20 bg-purple-500/10"
                    : "ring-1 ring-white/10 hover:ring-white/25 bg-muted/20"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center z-10 shadow-md shadow-purple-500/30">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className="w-full h-7 rounded mb-1 flex items-center justify-center overflow-hidden"
                  style={{ background: "#111" }}
                >
                  {fontsReady ? (
                    <span
                      style={{
                        fontFamily: `'${preset.fontFamily}', sans-serif`,
                        fontWeight: preset.fontWeight,
                        fontSize: "10px",
                        color: preset.textColor,
                        textShadow: preset.strokeWidth > 0
                          ? `1px 1px 0 ${preset.strokeColor}, -1px -1px 0 ${preset.strokeColor}`
                          : undefined,
                        textTransform: preset.textTransform as React.CSSProperties["textTransform"],
                        letterSpacing: `${preset.letterSpacing * 0.5}px`,
                      }}
                    >
                      <span style={{ color: preset.highlightColor }}>Your</span> text
                    </span>
                  ) : (
                    <div className="w-12 h-2.5 rounded bg-white/10 animate-pulse" />
                  )}
                </div>
                <div className="text-[10px] font-semibold text-foreground truncate">{preset.name}</div>
              </button>
            );
          })}
        </div>
        {/* Right fade hint on mobile — signals more presets to scroll */}
        {isMobile && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Customize toggle with summary */}
      <button
        onClick={() => setCustomizeOpen(!customizeOpen)}
        className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">Customize</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60">
            {summaryText}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", customizeOpen && "rotate-180")} />
        </div>
      </button>

      {customizeOpen && (
        <div className="space-y-4 pt-1">
          {/* Position */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Position</label>
            <div className="flex gap-1.5">
              {([
                { val: "top", Icon: AlignVerticalJustifyStart, label: "Top" },
                { val: "center", Icon: AlignVerticalJustifyCenter, label: "Center" },
                { val: "bottom", Icon: AlignVerticalJustifyEnd, label: "Bottom" },
              ] as const).map(({ val, Icon, label }) => (
                <button
                  key={val}
                  onClick={() => update({ position: val })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-medium border transition-colors min-h-[44px]",
                    value.position === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground/60 text-center">Optimized for TikTok/Reels</p>
          </div>

          {/* Size (S / M / L) — merged from Caption Layout */}
          {onSizeChange && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">Size</label>
              <div className="flex gap-1.5">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onSizeChange(size)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[11px] font-medium border transition-colors min-h-[44px]",
                      subtitleSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {size === "small" ? "S" : size === "medium" ? "M" : "L"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Text Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_COLORS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => update({ textColor: hex })}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all min-h-[28px]",
                    value.textColor === hex ? "border-white scale-110" : "border-transparent hover:border-white/50"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Highlight Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Active Word Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_COLORS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => update({ highlightColor: hex })}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all min-h-[28px]",
                    value.highlightColor === hex ? "border-white scale-110" : "border-transparent hover:border-white/50"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-muted-foreground">Font Size</label>
              <span className="text-[10px] text-muted-foreground/60">{value.fontSize}px</span>
            </div>
            <Slider
              min={20}
              max={48}
              step={1}
              value={[value.fontSize]}
              onValueChange={([v]) => update({ fontSize: v })}
            />
          </div>

          {/* Background toggle + opacity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-muted-foreground">Background Box</label>
              <button
                onClick={() => update({
                  backgroundColor: value.backgroundOpacity > 0 ? "transparent" : "#000000",
                  backgroundOpacity: value.backgroundOpacity > 0 ? 0 : 0.6,
                })}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded border transition-colors",
                  value.backgroundOpacity > 0
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-border/50 text-muted-foreground"
                )}
              >
                {value.backgroundOpacity > 0 ? "ON" : "OFF"}
              </button>
            </div>
            {value.backgroundOpacity > 0 && (
              <Slider
                min={0.1}
                max={1}
                step={0.05}
                value={[value.backgroundOpacity]}
                onValueChange={([v]) => update({ backgroundOpacity: v })}
              />
            )}
          </div>

          {/* Animation */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Animation</label>
            <div className="flex gap-1 flex-wrap">
              {ANIMATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ animation: opt.value })}
                  className={cn(
                    "px-2 py-1.5 rounded text-[10px] font-medium border transition-colors min-h-[32px]",
                    value.animation === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Transform */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">Text Transform</label>
            <div className="flex gap-1.5">
              {([
                { val: "none" as const, label: "Normal" },
                { val: "uppercase" as const, label: "UPPER" },
                { val: "lowercase" as const, label: "lower" },
              ]).map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => update({ textTransform: val })}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[11px] font-medium border transition-colors min-h-[36px]",
                    value.textTransform === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={resetToPreset}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Reset to preset defaults
          </Button>
        </div>
      )}
    </div>
  );
}

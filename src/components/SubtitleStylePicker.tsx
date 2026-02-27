import { useState } from "react";
import { ChevronDown, RotateCcw, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  SUBTITLE_PRESETS,
  type SubtitleStyle,
  type SubtitlePreset,
} from "@/config/subtitlePresets";

interface SubtitleStylePickerProps {
  value: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
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

export default function SubtitleStylePicker({ value, onChange }: SubtitleStylePickerProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);

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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Subtitle Style
      </h3>

      {/* Preset grid — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible scrollbar-hide">
        {SUBTITLE_PRESETS.map((preset) => (
          <button
            key={preset.presetId}
            onClick={() => applyPreset(preset)}
            className={cn(
              "flex-shrink-0 w-[110px] lg:w-auto rounded-lg p-2.5 text-left transition-all duration-200 border",
              value.presetId === preset.presetId
                ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_hsl(349,100%,59%,0.15)]"
                : "border-border/30 bg-muted/20 hover:border-border/60"
            )}
          >
            {/* Mini preview */}
            <div
              className="w-full h-8 rounded mb-1.5 flex items-center justify-center overflow-hidden"
              style={{ background: "#111" }}
            >
              <span
                style={{
                  fontFamily: `'${preset.fontFamily}', sans-serif`,
                  fontWeight: preset.fontWeight,
                  fontSize: "11px",
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
            </div>
            <div className="text-[11px] font-semibold text-foreground truncate">{preset.name}</div>
            <p className="text-[9px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Customize toggle */}
      <button
        onClick={() => setCustomizeOpen(!customizeOpen)}
        className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">Customize</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", customizeOpen && "rotate-180")} />
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
          </div>

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

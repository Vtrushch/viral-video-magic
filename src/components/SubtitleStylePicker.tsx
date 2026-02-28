import { useState, useEffect } from "react";
import { Check, ChevronDown, RotateCcw } from "lucide-react";
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
  subtitleY?: number;
  onSubtitleYChange?: (y: number) => void;
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

/* ─── Shared preset card ─── */
function PresetCard({
  preset,
  isSelected,
  onSelect,
  fontsReady,
  className,
}: {
  preset: SubtitlePreset;
  isSelected: boolean;
  onSelect: () => void;
  fontsReady: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative rounded-xl p-2.5 text-left transition-all duration-200 group my-0.5",
        isSelected
          ? "ring-2 ring-primary/60 bg-primary/8 shadow-[0_0_20px_-4px_hsl(349,100%,59%,0.2)] z-10"
          : "ring-1 ring-border/40 hover:ring-border/70 bg-card/30 hover:bg-card/50",
        className
      )}
    >
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10 shadow-md shadow-primary/30">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      <div
        className="w-full h-8 rounded-lg mb-1.5 flex items-center justify-center overflow-hidden"
        style={{ background: "hsl(240, 15%, 8%)" }}
      >
        {fontsReady ? (
          <span
            style={{
              fontFamily: `'${preset.fontFamily}', sans-serif`,
              fontWeight: preset.fontWeight,
              fontSize: "11px",
              color: preset.textColor,
              textShadow:
                preset.strokeWidth > 0
                  ? `1px 1px 0 ${preset.strokeColor}, -1px -1px 0 ${preset.strokeColor}`
                  : undefined,
              textTransform: preset.textTransform as React.CSSProperties["textTransform"],
              letterSpacing: `${preset.letterSpacing * 0.5}px`,
            }}
          >
            <span style={{ color: preset.highlightColor }}>Your</span>{" "}
            text
          </span>
        ) : (
          <div className="w-12 h-2.5 rounded bg-muted/30 animate-pulse" />
        )}
      </div>
      <div className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate text-center">
        {preset.name}
      </div>
    </button>
  );
}

export default function SubtitleStylePicker({
  value,
  onChange,
  subtitleY = 0.85,
  onSubtitleYChange,
}: SubtitleStylePickerProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
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
    const preset = SUBTITLE_PRESETS.find((p) => p.presetId === value.presetId);
    if (preset) applyPreset(preset);
  };

  const animLabel =
    value.animation !== "none" ? value.animation.replace("-", " ") : "No anim";
  const summaryText = `${animLabel} · ${value.fontSize}px`;

  return (
    <div className="space-y-4">
      {/* ─── Section: Subtitle Style ─── */}
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Subtitle Style
      </h3>

      {/* Mobile: horizontal scroll row — all 10 presets */}
      <div className="relative md:hidden -mx-4">
        <div
          className="flex gap-2 overflow-x-auto py-1 pb-2 scrollbar-hide px-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {SUBTITLE_PRESETS.map((preset) => (
            <PresetCard
              key={preset.presetId}
              preset={preset}
              isSelected={value.presetId === preset.presetId}
              onSelect={() => applyPreset(preset)}
              fontsReady={fontsReady}
              className="flex-shrink-0 w-[105px]"
            />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Desktop: 2-row grid */}
      <div className="hidden md:grid grid-rows-2 grid-flow-col auto-cols-[112px] gap-2 overflow-x-auto py-1 pb-2 px-0.5 scrollbar-hide">
        {SUBTITLE_PRESETS.map((preset) => (
          <PresetCard
            key={preset.presetId}
            preset={preset}
            isSelected={value.presetId === preset.presetId}
            onSelect={() => applyPreset(preset)}
            fontsReady={fontsReady}
          />
        ))}
      </div>

      {/* ─── Section: Caption Layout ─── */}
      {onSubtitleYChange && (
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Caption Layout
          </h3>
          <div className="flex items-center gap-3">
            {/* Mini phone preview */}
            <div className="relative w-8 h-14 rounded-md border border-border/50 bg-muted/20 flex-shrink-0 overflow-hidden">
              <div
                className="absolute left-1 right-1 h-1.5 rounded-full bg-primary transition-all duration-150"
                style={{
                  top: `${subtitleY * 100}%`,
                  transform: "translateY(-50%)",
                }}
              />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Top</span>
                <span className="text-[10px] text-muted-foreground">
                  Bottom
                </span>
              </div>
              <Slider
                min={0.05}
                max={0.95}
                step={0.01}
                value={[subtitleY]}
                onValueChange={([v]) => onSubtitleYChange(v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Customize toggle ─── */}
      <button
        onClick={() => setCustomizeOpen(!customizeOpen)}
        className={cn(
          "w-full flex items-center justify-between py-2.5 px-0.5 text-xs transition-colors rounded-md",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="font-semibold tracking-wide">Customize</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50">
            {summaryText}
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              customizeOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {customizeOpen && (
        <div className="space-y-5 pt-1">
          {/* Text Color */}
          <ColorRow
            label="Text Color"
            colors={QUICK_COLORS}
            selected={value.textColor}
            onSelect={(hex) => update({ textColor: hex })}
          />

          {/* Highlight Color */}
          <ColorRow
            label="Active Word Color"
            colors={QUICK_COLORS}
            selected={value.highlightColor}
            onSelect={(hex) => update({ highlightColor: hex })}
          />

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground">
                Font Size
              </label>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {value.fontSize}px
              </span>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground">
                Background Box
              </label>
              <button
                onClick={() =>
                  update({
                    backgroundColor:
                      value.backgroundOpacity > 0 ? "transparent" : "#000000",
                    backgroundOpacity: value.backgroundOpacity > 0 ? 0 : 0.6,
                  })
                }
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-0.5 rounded-md border transition-colors",
                  value.backgroundOpacity > 0
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-border/50 text-muted-foreground hover:border-border"
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
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Animation
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {ANIMATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ animation: opt.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-150 min-h-[32px]",
                    value.animation === opt.value
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_-3px_hsl(349,100%,59%,0.3)]"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Transform */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Text Transform
            </label>
            <div className="flex gap-1.5">
              {(
                [
                  { val: "none" as const, label: "Normal" },
                  { val: "uppercase" as const, label: "UPPER" },
                  { val: "lowercase" as const, label: "lower" },
                ] as const
              ).map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => update({ textTransform: val })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all duration-150 min-h-[36px]",
                    value.textTransform === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground"
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
            className="w-full text-xs gap-1.5"
            onClick={resetToPreset}
          >
            <RotateCcw className="w-3 h-3" />
            Reset to preset defaults
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable color row ─── */
function ColorRow({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  colors: string[];
  selected: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2 flex-wrap">
        {colors.map((hex) => (
          <button
            key={hex}
            onClick={() => onSelect(hex)}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all duration-150 min-h-[28px]",
              selected === hex
                ? "border-foreground scale-110 shadow-[0_0_8px_0_rgba(255,255,255,0.2)]"
                : "border-transparent hover:border-muted-foreground/40 hover:scale-105"
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import type { SubtitleStyle } from "@/config/subtitlePresets";

interface WordToken {
  word: string;
  start: number;
  end: number;
}

interface StyledLiveSubtitlesProps {
  words: WordToken[];
  relativeTime: number;
  style: SubtitleStyle;
  groupSize?: number;
  sampleText?: string;
  /** Optional continuous vertical position override (0 = top, 1 = bottom). Overrides style.position when provided. */
  positionY?: number;
  /** Optional size multiplier (e.g. 0.8 for small, 1 for medium, 1.3 for large) */
  sizeScale?: number;
  /** Width of the preview container in px. Used to scale font size relative to 1080p render width. */
  containerWidth?: number;
}

const TOLERANCE = 0.08;

export default function StyledLiveSubtitles({
  words,
  relativeTime,
  style,
  groupSize,
  sampleText,
  positionY,
  sizeScale = 1,
  containerWidth,
}: StyledLiveSubtitlesProps) {
  // Scale factor: render target is 1080px wide, preview is smaller
  const scaleFactor = containerWidth ? containerWidth / 1080 : 0.6;
  const effectiveGroupSize = groupSize ?? style.maxWordsPerLine ?? 4;

  const { group, groupKey } = useMemo(() => {
    // If no words but sampleText provided, create fake words
    if (words.length === 0 && sampleText) {
      const fakeWords = sampleText.split(/\s+/).map((w, i) => ({
        word: w, start: i * 0.5, end: (i + 1) * 0.5,
      }));
      return { group: fakeWords.slice(0, effectiveGroupSize), groupKey: "sample" };
    }

    if (words.length === 0) return { group: [], groupKey: "" };

    let activeIdx = words.findIndex(
      (w) => relativeTime >= w.start && relativeTime < w.end + TOLERANCE
    );

    if (activeIdx === -1) {
      const upcomingIdx = words.findIndex((w) => w.start > relativeTime);
      if (upcomingIdx === -1) return { group: [], groupKey: "" };
      activeIdx = upcomingIdx;
    }

    const start = Math.floor(activeIdx / effectiveGroupSize) * effectiveGroupSize;
    const g = words.slice(start, start + effectiveGroupSize);
    return { group: g, groupKey: `g-${start}` };
  }, [words, relativeTime, effectiveGroupSize, sampleText]);

  if (group.length === 0) return null;

  // Position mapping — positionY override takes priority
  const positionStyle: React.CSSProperties = {};
  if (positionY !== undefined) {
    // Continuous positioning: positionY is 0–1 (0=top, 1=bottom)
    positionStyle.top = `${Math.max(5, Math.min(90, positionY * 100))}%`;
    positionStyle.bottom = "auto";
    positionStyle.transform = "translateY(-50%)";
  } else if (style.position === "top") {
    positionStyle.top = "10%";
    positionStyle.bottom = "auto";
  } else if (style.position === "center") {
    positionStyle.top = "50%";
    positionStyle.bottom = "auto";
    positionStyle.transform = "translateY(-50%)";
  } else {
    positionStyle.bottom = "15%";
    positionStyle.top = "auto";
  }

  // Background
  const hasBg = style.backgroundColor !== "transparent" && style.backgroundOpacity > 0;
  const bgColor = hasBg
    ? hexToRgba(style.backgroundColor, style.backgroundOpacity)
    : "rgba(0,0,0,0.4)";

  // Animation for the group container
  const animationName =
    style.animation === "pop-up" ? "subtitlePopUp" :
    style.animation === "bounce" ? "subtitleBounce" :
    style.animation === "fade-in" ? "subtitleFadeIn" :
    style.animation === "glow-pulse" ? "subtitleGlowPulse" :
    "captionPop";

  const animationDuration =
    style.animation === "bounce" ? "0.6s" :
    style.animation === "glow-pulse" ? "2s" : "0.25s";

  const animationIteration =
    style.animation === "bounce" || style.animation === "glow-pulse" ? "infinite" : "1";

  const isSample = words.length === 0 && !!sampleText;

  return (
    <div
      className="absolute left-[8%] right-[8%] text-center pointer-events-none z-20"
      style={positionStyle}
    >
      <div
        key={groupKey}
        className="inline-flex flex-wrap justify-center gap-x-1.5 px-3 py-2 rounded-xl"
        style={{
          background: bgColor,
          backdropFilter: hasBg ? undefined : "blur(6px)",
          animationName,
          animationDuration,
          animationTimingFunction: "ease-out",
          animationIterationCount: animationIteration,
          animationFillMode: "both",
          ["--subtitle-glow-color" as string]: style.shadow?.color || style.highlightColor,
          lineHeight: 1.2,
        }}
      >
        {group.map((w, wi) => {
          const isActive = isSample
            ? wi === 0
            : relativeTime >= w.start && relativeTime < w.end + TOLERANCE;
          return (
            <StyledWord
              key={`${wi}-${w.word}`}
              word={w.word}
              isActive={isActive}
              style={style}
              sizeScale={sizeScale}
              scaleFactor={scaleFactor}
            />
          );
        })}
      </div>
    </div>
  );
}

function StyledWord({
  word,
  isActive,
  style,
  sizeScale = 1,
  scaleFactor = 0.6,
}: {
  word: string;
  isActive: boolean;
  style: SubtitleStyle;
  sizeScale?: number;
  scaleFactor?: number;
}) {
  const color = isActive ? style.highlightColor : style.textColor;

  // Build text-shadow — always include a readability shadow
  const shadows: string[] = [
    "0 2px 8px rgba(0,0,0,0.8)",
    "0 0 4px rgba(0,0,0,0.5)",
  ];
  if (style.strokeWidth > 0 && style.strokeColor !== "transparent") {
    const sw = style.strokeWidth * scaleFactor;
    const sc = style.strokeColor;
    shadows.push(`${sw}px ${sw}px 0 ${sc}`, `${-sw}px ${-sw}px 0 ${sc}`, `${sw}px ${-sw}px 0 ${sc}`, `${-sw}px ${sw}px 0 ${sc}`);
  }
  if (style.shadow?.enabled) {
    shadows.push(`${style.shadow.offsetX * scaleFactor}px ${style.shadow.offsetY * scaleFactor}px ${style.shadow.blur * scaleFactor}px ${style.shadow.color}`);
  }

  const wordStyle: React.CSSProperties = {
    fontFamily: `'${style.fontFamily}', sans-serif`,
    fontWeight: style.fontWeight,
    fontSize: `${style.fontSize * scaleFactor * sizeScale}px`,
    color,
    textShadow: shadows.join(", "),
    textTransform: style.textTransform as React.CSSProperties["textTransform"],
    letterSpacing: `${style.letterSpacing * scaleFactor}px`,
    lineHeight: 1.2,
    transform: isActive ? "scale(1.15)" : "scale(1)",
    transition: "transform 0.12s ease, color 0.1s ease",
    display: "inline-block",
  };

  return <span style={wordStyle}>{word}</span>;
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

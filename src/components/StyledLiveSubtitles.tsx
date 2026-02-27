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
}

const TOLERANCE = 0.08;

export default function StyledLiveSubtitles({
  words,
  relativeTime,
  style,
  groupSize,
}: StyledLiveSubtitlesProps) {
  const effectiveGroupSize = groupSize ?? style.maxWordsPerLine ?? 4;

  const { group, groupKey } = useMemo(() => {
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
  }, [words, relativeTime, effectiveGroupSize]);

  if (group.length === 0) return null;

  // Position mapping with safe zones
  const positionStyle: React.CSSProperties = {};
  if (style.position === "top") {
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

  return (
    <div
      className="absolute left-[5%] right-[5%] text-center pointer-events-none z-20"
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
        }}
      >
        {group.map((w, wi) => {
          const isActive =
            relativeTime >= w.start && relativeTime < w.end + TOLERANCE;
          return (
            <StyledWord
              key={`${wi}-${w.word}`}
              word={w.word}
              isActive={isActive}
              style={style}
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
}: {
  word: string;
  isActive: boolean;
  style: SubtitleStyle;
}) {
  const color = isActive ? style.highlightColor : style.textColor;

  // Build text-shadow
  const shadows: string[] = [];
  if (style.strokeWidth > 0 && style.strokeColor !== "transparent") {
    const sw = style.strokeWidth;
    const sc = style.strokeColor;
    shadows.push(`${sw}px ${sw}px 0 ${sc}`, `${-sw}px ${-sw}px 0 ${sc}`, `${sw}px ${-sw}px 0 ${sc}`, `${-sw}px ${sw}px 0 ${sc}`);
  }
  if (style.shadow?.enabled) {
    shadows.push(`${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${isActive ? style.shadow.color : style.shadow.color}`);
  }

  const wordStyle: React.CSSProperties = {
    fontFamily: `'${style.fontFamily}', sans-serif`,
    fontWeight: style.fontWeight,
    fontSize: `${Math.max(20, Math.min(48, style.fontSize)) * 0.6}px`, // Scale down for preview
    color,
    textShadow: shadows.length > 0 ? shadows.join(", ") : undefined,
    textTransform: style.textTransform as React.CSSProperties["textTransform"],
    letterSpacing: `${style.letterSpacing}px`,
    lineHeight: style.lineHeight,
    transform: isActive ? "scale(1.12)" : "scale(1)",
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

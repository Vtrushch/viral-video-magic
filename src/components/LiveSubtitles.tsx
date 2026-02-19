import { useMemo } from "react";

export type CaptionStyle = "hormozi" | "mrbeast" | "minimal" | "neon" | "fire" | "elegant" | "custom";

interface WordToken {
  word: string;
  start: number;
  end: number;
}

interface LiveSubtitlesProps {
  words: WordToken[];
  relativeTime: number;
  captionStyle?: CaptionStyle;
  groupSize?: number;
  customColor?: string;
}

const TOLERANCE = 0.08;

export default function LiveSubtitles({
  words,
  relativeTime,
  captionStyle = "hormozi",
  groupSize = 3,
  customColor,
}: LiveSubtitlesProps) {
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

    const start = Math.floor(activeIdx / groupSize) * groupSize;
    const g = words.slice(start, start + groupSize);
    return { group: g, groupKey: `g-${start}` };
  }, [words, relativeTime, groupSize]);

  if (group.length === 0) return null;

  const bgStyle =
    captionStyle === "minimal"
      ? "rgba(0,0,0,0.55)"
      : "rgba(0,0,0,0.4)";

  return (
    <div
      className="absolute left-2 right-2 text-center pointer-events-none z-20"
      style={{ bottom: "22%" }}
    >
      <div
        key={groupKey}
        className="inline-flex flex-wrap justify-center gap-x-1.5 px-3 py-2 rounded-xl"
        style={{
          background: bgStyle,
          backdropFilter: "blur(6px)",
          animation: "captionPop 0.18s ease-out",
        }}
      >
        {group.map((w, wi) => {
          const isActive =
            relativeTime >= w.start && relativeTime < w.end + TOLERANCE;
          return (
            <WordSpan
              key={`${wi}-${w.word}`}
              word={w.word}
              isActive={isActive}
              captionStyle={captionStyle}
              wordIndex={wi}
              customColor={customColor}
            />
          );
        })}
      </div>
    </div>
  );
}

function WordSpan({
  word,
  isActive,
  captionStyle,
  wordIndex,
  customColor,
}: {
  word: string;
  isActive: boolean;
  captionStyle: CaptionStyle;
  wordIndex: number;
  customColor?: string;
}) {
  if (captionStyle === "hormozi") {
    return (
      <span
        style={{
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: "1.2rem",
          color: isActive ? "#FFD600" : "#FFFFFF",
          textShadow:
            "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          transform: isActive ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.1s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  if (captionStyle === "mrbeast") {
    const isRed = wordIndex % 2 === 0;
    return (
      <span
        style={{
          fontWeight: 900,
          fontSize: "1.25rem",
          color: isActive
            ? isRed
              ? "#FF3333"
              : "#FFFFFF"
            : isRed
              ? "#FF6666"
              : "rgba(255,255,255,0.7)",
          textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          transform: isActive ? "scale(1.18)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.1s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  if (captionStyle === "neon") {
    return (
      <span
        style={{
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: "1.2rem",
          color: isActive ? "#00FF00" : "#88FF88",
          textShadow: isActive
            ? "0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 40px #00FF00, 2px 2px 0 #000"
            : "2px 2px 0 #000, 0 0 8px rgba(0,255,0,0.3)",
          textTransform: "uppercase",
          transform: isActive ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.1s ease, text-shadow 0.15s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  if (captionStyle === "fire") {
    return (
      <span
        style={{
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: "1.2rem",
          color: isActive ? "#FF4500" : "#FF8C00",
          textShadow: isActive
            ? "0 0 8px #FF4500, 0 0 16px rgba(255,69,0,0.5), 2px 2px 0 #000"
            : "2px 2px 0 #000, 0 0 6px rgba(255,140,0,0.3)",
          textTransform: "uppercase",
          transform: isActive ? "scale(1.18)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.1s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  if (captionStyle === "elegant") {
    return (
      <span
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontWeight: isActive ? 600 : 400,
          fontSize: "1.05rem",
          color: isActive ? "#FFFFFF" : "rgba(240,240,240,0.7)",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          fontStyle: "italic",
          transform: isActive ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.15s ease, color 0.12s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  if (captionStyle === "custom" && customColor) {
    const hex = `#${customColor}`;
    return (
      <span
        style={{
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: "1.2rem",
          color: isActive ? hex : "#FFFFFF",
          textShadow:
            "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
          textTransform: "uppercase",
          transform: isActive ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.1s ease",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    );
  }

  // minimal
  return (
    <span
      style={{
        fontWeight: isActive ? 600 : 400,
        fontSize: "1rem",
        color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.65)",
        textShadow: "0 1px 6px rgba(0,0,0,0.5)",
        transform: isActive ? "scale(1.08)" : "scale(1)",
        transition: "transform 0.12s ease, color 0.1s ease",
        display: "inline-block",
      }}
    >
      {word}
    </span>
  );
}

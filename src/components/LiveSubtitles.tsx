import { useMemo } from "react";

export type CaptionStyle = "hormozi" | "mrbeast" | "minimal";

interface WordToken {
  word: string;
  start: number;
  end: number;
}

interface LiveSubtitlesProps {
  /** Array of word tokens with timing (relative to clip start = 0) */
  words: WordToken[];
  /** Current playback time, already offset to be relative to clip start */
  relativeTime: number;
  captionStyle?: CaptionStyle;
  /** Number of words per group (default 3) */
  groupSize?: number;
}

const TOLERANCE = 0.08; // seconds of lookahead so subtitles feel snappy

export default function LiveSubtitles({
  words,
  relativeTime,
  captionStyle = "hormozi",
  groupSize = 3,
}: LiveSubtitlesProps) {
  const { group, groupKey } = useMemo(() => {
    if (words.length === 0) return { group: [], groupKey: "" };

    // Find the active word index
    let activeIdx = words.findIndex(
      (w) => relativeTime >= w.start && relativeTime < w.end + TOLERANCE
    );

    if (activeIdx === -1) {
      // No active word — find the next upcoming word
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
}: {
  word: string;
  isActive: boolean;
  captionStyle: CaptionStyle;
  wordIndex: number;
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

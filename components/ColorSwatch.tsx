"use client";

import { useState } from "react";

interface ColorSwatchProps {
  colors: Array<{
    name: string;
    hex: string;
  }>;
  maxVisible?: number;
}

export default function ColorSwatch({ colors, maxVisible = 5 }: ColorSwatchProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const visibleColors = colors.slice(0, maxVisible);
  const remainingCount = Math.max(0, colors.length - maxVisible);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {visibleColors.map((color, index) => (
          <div
            key={`${color.hex}-${index}`}
            className="relative flex-shrink-0 group"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Color Circle */}
            <div
              className="w-8 h-8 rounded-full border-2 border-[var(--border)] hover:border-[var(--ink)] transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: color.hex,
              }}
              title={`${color.name} - ${color.hex}`}
            />

            {/* Tooltip */}
            {hoveredIndex === index && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--ink)] text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                {color.name}
                <div className="text-[0.65rem] opacity-75">{color.hex}</div>
              </div>
            )}
          </div>
        ))}

        {/* Remaining Count Badge */}
        {remainingCount > 0 && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--ink)]">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Total Count */}
      <div className="text-xs text-[var(--ink-muted)]">
        {colors.length} color{colors.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

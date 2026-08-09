"use client";

/**
 * Zero-load YouTube preview for the COACH program builder.
 *
 * Unlike MovementVideoPreview (athlete-side, IntersectionObserver + autoplay),
 * this component renders NO iframe on mount. It shows a static YouTube
 * thumbnail with a play overlay; the coach clicks to swap it for an iframe.
 *
 * Why: the coach builder can hold hundreds of movements on a single page
 * (6-week × 7-day × 5-block × 5-movement programs = 600+ videos). Rendering
 * every iframe with autoplay=1 crashes the browser. This component only
 * loads what the coach explicitly asks to see.
 */

import { useState } from "react";
import { ytEmbed, ytSearchUrl } from "@/lib/youtube";

function ytId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function CoachMovementVideoThumb({
  url,
  name,
}: {
  url?: string | null;
  name: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const embedUrl = ytEmbed(url);
  const videoId = ytId(url);

  // No embeddable URL — render a tiny "search YouTube" affordance and nothing else.
  if (!embedUrl) {
    if (url && url.includes("results?search_query")) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-[var(--primary)] hover:underline"
        >
          🔍 Search YouTube for &quot;{name}&quot; — pick a video and paste the URL above
        </a>
      );
    }
    return (
      <a
        href={ytSearchUrl(name)}
        target="_blank"
        rel="noreferrer"
        className="block text-xs text-[var(--primary)] hover:underline"
      >
        🔍 Search YouTube for &quot;{name}&quot;
      </a>
    );
  }

  // Coach clicked → render the iframe. Autoplay is fine here because it's an
  // explicit user gesture, not page load.
  if (loaded) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden border border-[var(--border)]">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Default: static thumbnail (one HTTP call per movement, no iframe cost).
  const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group relative w-full aspect-video rounded-lg overflow-hidden border border-[var(--border)] bg-black block"
      title="Click to load video"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
          {name}
        </div>
      )}
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-12 h-9 rounded-lg bg-red-600/90 group-hover:bg-red-600 grid place-items-center shadow-lg transition">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

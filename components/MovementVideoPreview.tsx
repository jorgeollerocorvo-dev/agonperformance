"use client";

/**
 * Athlete-side movement video preview.
 *
 * Standard #2: videos DO NOT autoplay. The default state is a static YouTube
 * thumbnail with a play button overlay. The iframe is only mounted when the
 * athlete taps/clicks the thumbnail. This keeps the calendar + session views
 * instant on load (no third-party JS, no network beyond a single image) and
 * stops N videos playing when the page has multiple exercises.
 *
 * Scroll performance: 100% static markup until a click. No IntersectionObserver,
 * no auto-mount.
 */

import { useState } from "react";
import { ytEmbed, ytSearchUrl } from "@/lib/youtube";

function ytId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
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

export default function MovementVideoPreview({
  url,
  name,
  ctaLabel,
}: {
  url?: string | null;
  name: string;
  ctaLabel: string;
}) {
  const embedUrl = ytEmbed(url);
  const videoId = ytId(url);
  const [playing, setPlaying] = useState(false);

  // No specific YouTube video URL → gradient placeholder that links to YT search.
  if (!embedUrl) {
    const searchUrl = ytSearchUrl(name);
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="group relative block aspect-video max-w-2xl rounded-xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-[var(--ink)] to-[var(--accent-purple)]"
      >
        <div className="absolute inset-0 flex items-end justify-start p-4 sm:p-5 text-white">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/70">{ctaLabel}</div>
            <div className="text-base sm:text-lg font-bold drop-shadow">{name}</div>
          </div>
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-14 h-10 sm:w-16 sm:h-11 rounded-xl bg-red-600/90 group-hover:bg-red-600 grid place-items-center shadow-lg transition">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
    );
  }

  const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

  if (playing) {
    // Append autoplay=1 ONLY here, after the user clicked. ytEmbed itself
    // never includes autoplay (standard #2).
    const url = `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`;
    return (
      <div className="relative aspect-video max-w-2xl rounded-xl overflow-hidden bg-black">
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative aspect-video max-w-2xl rounded-xl overflow-hidden bg-black block w-full group"
      aria-label={`Play ${name}`}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 grid place-items-center bg-black/10 group-hover:bg-black/0 transition">
        <div className="w-14 h-10 sm:w-16 sm:h-11 rounded-xl bg-red-600/90 group-hover:bg-red-600 grid place-items-center shadow-lg transition">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

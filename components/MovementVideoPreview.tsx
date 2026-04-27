"use client";

/**
 * Athlete-side movement video preview.
 *
 * Lazy + auto-play (muted) when the card scrolls into view.
 *
 * - The iframe is NOT rendered on initial paint — we paint a lightweight placeholder
 *   (YouTube thumbnail or gradient card) and only swap in the iframe when the card
 *   enters the viewport via IntersectionObserver. Once swapped in, it stays.
 * - The iframe URL embeds `autoplay=1&mute=1`, so playback starts the moment it loads,
 *   silently. Browsers allow muted autoplay everywhere.
 * - The first card on the page is always in view at mount → it starts immediately.
 * - For movements without a specific video URL, we render a tappable gradient
 *   placeholder that opens YouTube search.
 */

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!embedUrl) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true); // SSR / older browser fallback: just load it
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [embedUrl]);

  // — No specific YouTube video URL → gradient placeholder that links to YT search —
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

  return (
    <div
      ref={ref}
      className="relative aspect-video max-w-2xl rounded-xl overflow-hidden bg-black"
    >
      {inView ? (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        // Lightweight placeholder: YouTube's static thumbnail + play overlay.
        // No JS, no network beyond the thumbnail image.
        <>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-14 h-10 sm:w-16 sm:h-11 rounded-xl bg-red-600/90 grid place-items-center shadow-lg">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

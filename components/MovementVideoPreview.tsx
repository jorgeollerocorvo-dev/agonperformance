/**
 * Athlete-side movement video preview.
 *
 * - If we have a real YouTube video URL → render the embed iframe (showing the YT thumbnail + play button automatically).
 * - Otherwise → render a TrueCoach-style preview card: 16:9 placeholder with the movement name + a YouTube-style play button.
 *   Tapping the card opens a YouTube search for the movement so the athlete still gets a demo.
 */

import { ytEmbed, ytSearchUrl } from "@/lib/youtube";

export default function MovementVideoPreview({
  url,
  name,
  ctaLabel,
}: {
  url?: string | null;
  name: string;
  ctaLabel: string;
}) {
  const embed = ytEmbed(url);

  if (embed) {
    return (
      <div className="aspect-video max-w-2xl rounded-xl overflow-hidden bg-black">
        <iframe
          src={embed}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const searchUrl = ytSearchUrl(name);
  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative block aspect-video max-w-2xl rounded-xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-[var(--ink)] to-[var(--accent-purple)]"
    >
      {/* Movement name overlay */}
      <div className="absolute inset-0 flex items-end justify-start p-4 sm:p-5 text-white">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/70">{ctaLabel}</div>
          <div className="text-base sm:text-lg font-bold drop-shadow">{name}</div>
        </div>
      </div>

      {/* YouTube-style play button */}
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

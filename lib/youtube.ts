export function ytEmbed(url?: string | null): string | null {
  if (!url) return null;
  // Always include params: muted (no audio per the user's spec), modestbranding,
  // disable suggested-from-other-channels at end (rel=0), keep player chrome simple.
  const params = "mute=1&modestbranding=1&rel=0&playsinline=1";
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}?${params}`;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?${params}`;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}?${params}`;
      }
      if (u.pathname.startsWith("/embed/")) {
        // Already an embed URL — append params if not present
        return url.includes("?") ? `${url}&${params}` : `${url}?${params}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** True if the URL is a YouTube search results page (can't be embedded). */
export function isYoutubeSearch(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith("youtube.com") && u.pathname === "/results";
  } catch {
    return false;
  }
}

/** Quick fallback: a search URL for an exercise name, so the athlete can find a demo. */
export function ytSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise demo")}`;
}

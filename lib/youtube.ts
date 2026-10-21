// Client-safe YouTube helpers. Kept free of Node built-ins so the Knowledge
// Center UI and the API can share the same parsing rules.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-char video id from common YouTube URL shapes. */
export function youtubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;

  if (ID_RE.test(raw)) return raw;

  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '').toLowerCase();
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
    return ID_RE.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const v = parsed.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
      return ID_RE.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

export function youtubeEmbedUrl(url?: string | null): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&autoplay=1` : null;
}

export function youtubeThumbnailUrl(url?: string | null): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

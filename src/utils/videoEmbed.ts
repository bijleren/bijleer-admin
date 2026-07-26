export type VideoProvider = 'youtube' | 'vimeo' | 'unknown';

export interface VideoEmbedInfo {
  type: VideoProvider;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  videoId: string | null;
}

export function getVideoEmbed(url: string): VideoEmbedInfo {
  if (!url) return { type: 'unknown', embedUrl: null, thumbnailUrl: null, videoId: null };

  const trimmed = url.trim();

  // YouTube watch URL: https://www.youtube.com/watch?v=ID
  let match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  if (match) {
    const videoId = match[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    };
  }

  // Vimeo: https://player.vimeo.com/video/ID or https://vimeo.com/ID
  match = trimmed.match(/vimeo\.com\/(?:video\/|player\/)?(\d+)/);
  if (match) {
    const videoId = match[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      thumbnailUrl: null,
      videoId,
    };
  }

  return { type: 'unknown', embedUrl: null, thumbnailUrl: null, videoId: null };
}

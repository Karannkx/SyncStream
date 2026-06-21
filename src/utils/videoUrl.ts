export type VideoType = "youtube" | "gdrive" | "hls" | "mp4" | "other";

export function detectVideoType(url: string): VideoType {
  if (!url) return "other";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/drive\.google\.com/i.test(url)) return "gdrive";
  if (/\.m3u8(\?|$)/i.test(url)) return "hls";
  if (/\.mp4(\?|$)/i.test(url)) return "mp4";
  return "other";
}

/**
 * Extracts the file ID from any Google Drive share URL format:
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID
 */
export function getGDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Returns the Google Drive iframe embed URL (fallback only — no JS control).
 */
export function getGDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Returns a direct streamable URL for a publicly shared Google Drive file.
 *
 * This URL can be used as a <video src> — HTML media elements follow redirects
 * and load cross-origin media without CORS headers (unlike fetch/XHR).
 * The `confirm=t` parameter bypasses Drive's large-file download warning.
 *
 * Requirement: the file must be shared as "Anyone with the link can view".
 * Works for files up to ~1–2 GB reliably; very large files may still trigger
 * the warning (in which case SyncPlayer falls back to the iframe embed).
 */
export function getGDriveDirectUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

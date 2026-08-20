/**
 * Normalizes user-provided image URLs into direct browser-renderable image endpoints.
 * Handles:
 * - Google Drive share links (view, edit, open, uc?id) -> Direct Google CDN (lh3.googleusercontent.com/d/ID)
 * - Dropbox share links -> Direct raw image stream (raw=1)
 * - Standard direct image URLs (http/https/data)
 */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Handle Google Drive links
  // Pattern 1: drive.google.com/file/d/{FILE_ID}/view... or /edit... or /preview...
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // Pattern 2: drive.google.com/open?id={FILE_ID} or drive.google.com/uc?id={FILE_ID} or docs.google.com
  if (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) {
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      const fileId = idMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 2. Handle Dropbox share links
  if (trimmed.includes("dropbox.com")) {
    if (trimmed.includes("?raw=1") || trimmed.includes("&raw=1")) {
      return trimmed;
    }
    const cleanUrl = trimmed.replace(/[?&]dl=0/i, "").replace(/[?&]dl=1/i, "");
    return cleanUrl.concat(cleanUrl.includes("?") ? "&raw=1" : "?raw=1");
  }

  return trimmed;
}

// ================================
// URL Detection Utility
// ================================

/**
 * Detects URLs in text and returns them
 */
export function detectUrls(text: string): string[] {
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Checks if text contains URLs
 */
export function hasUrls(text: string): boolean {
  return detectUrls(text).length > 0;
}

/**
 * Extracts the first URL from text
 */
export function getFirstUrl(text: string): string | null {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0] : null;
}


/**
 * URL Detection and Validation Utilities
 *
 * Used by Evidence system to detect and validate URLs in user-provided text,
 * enabling automatic link preview generation.
 */

/**
 * Extract all HTTP/HTTPS URLs from text
 *
 * @param text - Text to search for URLs
 * @returns Array of URL strings found in text
 *
 * @example
 * extractUrls("Check this https://example.com and https://test.com")
 * // Returns: ["https://example.com", "https://test.com"]
 */
export function extractUrls(text: string): string[] {
  // Regex to match http/https URLs
  // Matches: https://example.com, http://test.org/path?query=1
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Validate if a string is a valid HTTP/HTTPS URL
 *
 * @param url - String to validate
 * @returns true if valid URL, false otherwise
 *
 * @example
 * isValidUrl("https://example.com") // true
 * isValidUrl("not a url") // false
 * isValidUrl("ftp://example.com") // false (only http/https allowed)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Clean URL by removing trailing punctuation
 *
 * URLs extracted from text may include trailing punctuation like periods or commas.
 * This function cleans them up.
 *
 * @param url - URL to clean
 * @returns Cleaned URL
 *
 * @example
 * cleanUrl("https://example.com.") // "https://example.com"
 * cleanUrl("https://example.com,") // "https://example.com"
 */
export function cleanUrl(url: string): string {
  // Remove trailing punctuation
  return url.replace(/[.,;!?]+$/, "");
}

/**
 * Extract domain from URL
 *
 * @param url - URL to extract domain from
 * @returns Domain string or empty string if invalid
 *
 * @example
 * extractDomain("https://www.example.com/path") // "www.example.com"
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

/**
 * Get domain from URL (alias for extractDomain)
 *
 * @param url - URL to get domain from
 * @returns Domain string or empty string if invalid
 */
export function getDomain(url: string): string {
  return extractDomain(url);
}

/**
 * Normalize URL by removing fragments and trailing slashes
 *
 * @param url - URL to normalize
 * @returns Normalized URL
 *
 * @example
 * normalizeUrl("https://example.com/path/#fragment") // "https://example.com/path"
 * normalizeUrl("https://example.com/path/") // "https://example.com/path"
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove fragment
    parsed.hash = "";
    // Remove trailing slash from pathname
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract URLs from text and clean them
 *
 * Convenience function that combines extractUrls and cleanUrl
 *
 * @param text - Text to search for URLs
 * @returns Array of cleaned, valid URLs
 *
 * @example
 * extractAndCleanUrls("Check https://example.com.")
 * // Returns: ["https://example.com"]
 */
export function extractAndCleanUrls(text: string): string[] {
  const urls = extractUrls(text);
  return urls.map(cleanUrl).filter(isValidUrl);
}

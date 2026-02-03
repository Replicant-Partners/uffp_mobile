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
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
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
  return url.replace(/[.,;!?]+$/, '');
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
    return '';
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
  return urls
    .map(cleanUrl)
    .filter(isValidUrl);
}

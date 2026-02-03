/**
 * Link Preview Service
 *
 * Fetches metadata from URLs for link preview cards
 */

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  fetchedAt: string;
  error?: string;
}

/**
 * Fetch link preview metadata from a URL
 *
 * Uses a simple fetch to get HTML and parse meta tags
 * In production, you might want to use a dedicated service or API
 */
export async function fetchLinkPreview(
  url: string,
): Promise<LinkPreviewData> {
  try {
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UFP-Mobile/1.0; +https://uffp.app)",
      },
      // Set timeout to 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract metadata using regex (simple approach)
    // In production, consider using a proper HTML parser
    const title =
      extractMetaTag(html, "og:title") ||
      extractMetaTag(html, "twitter:title") ||
      extractTitleTag(html) ||
      url;

    const description =
      extractMetaTag(html, "og:description") ||
      extractMetaTag(html, "twitter:description") ||
      extractMetaTag(html, "description") ||
      "";

    const image =
      extractMetaTag(html, "og:image") ||
      extractMetaTag(html, "twitter:image");

    const favicon = extractFavicon(html, url);

    return {
      url,
      title,
      description,
      image,
      favicon,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Return error state but with basic info
    return {
      url,
      title: new URL(url).hostname,
      description: "",
      fetchedAt: new Date().toISOString(),
      error:
        error instanceof Error ? error.message : "Failed to fetch preview",
    };
  }
}

/**
 * Extract meta tag content from HTML
 */
function extractMetaTag(html: string, property: string): string | undefined {
  // Try Open Graph format: <meta property="og:title" content="...">
  const ogRegex = new RegExp(
    `<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`,
    "i",
  );
  let match = html.match(ogRegex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try standard format: <meta name="description" content="...">
  const nameRegex = new RegExp(
    `<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`,
    "i",
  );
  match = html.match(nameRegex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try reversed order
  const reversedOgRegex = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+property=["']${property}["']`,
    "i",
  );
  match = html.match(reversedOgRegex);
  if (match) return decodeHtmlEntities(match[1]);

  const reversedNameRegex = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+name=["']${property}["']`,
    "i",
  );
  match = html.match(reversedNameRegex);
  if (match) return decodeHtmlEntities(match[1]);

  return undefined;
}

/**
 * Extract title from <title> tag
 */
function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

/**
 * Extract favicon URL
 */
function extractFavicon(html: string, baseUrl: string): string | undefined {
  // Try to find <link rel="icon"> or <link rel="shortcut icon">
  const iconRegex =
    /<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i;
  const match = html.match(iconRegex);

  if (match) {
    const href = match[1];
    // Make absolute URL if relative
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  // Fallback to /favicon.ico
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

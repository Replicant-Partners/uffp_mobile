/**
 * Link Preview Service
 * 
 * Fetches metadata (title, description, image, favicon) from URLs
 * for rich preview cards in Evidence.
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
 * Uses a simple HTML meta tag extraction approach.
 * In production, you may want to use a dedicated service like:
 * - https://microlink.io
 * - https://www.linkpreview.net
 * - Self-hosted metadata extraction service
 * 
 * @param url - URL to fetch preview for
 * @returns LinkPreviewData with metadata or error
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  try {
    // For now, use a simple fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UFFP-Mobile/1.0; +https://uffp.app)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        title: extractTitleFromUrl(url),
        description: '',
        fetchedAt: new Date().toISOString(),
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    
    // Extract metadata from HTML
    const metadata = extractMetadata(html, url);

    return {
      url,
      title: metadata.title || extractTitleFromUrl(url),
      description: metadata.description || '',
      image: metadata.image,
      favicon: metadata.favicon,
      fetchedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    // Handle timeout, network errors, etc.
    return {
      url,
      title: extractTitleFromUrl(url),
      description: '',
      fetchedAt: new Date().toISOString(),
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}

/**
 * Extract title from URL as fallback
 * 
 * @param url - URL to extract title from
 * @returns Readable title derived from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname
      .split('/')
      .filter(segment => segment.length > 0)
      .join(' › ');
    
    return path ? `${domain} › ${path}` : domain;
  } catch {
    return url;
  }
}

/**
 * Extract metadata from HTML
 * 
 * Looks for Open Graph tags, Twitter Card tags, and standard meta tags
 * 
 * @param html - HTML content
 * @param url - Base URL for resolving relative URLs
 * @returns Extracted metadata
 */
function extractMetadata(html: string, url: string): {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
} {
  const metadata: {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
  } = {};

  // Extract title (priority: og:title > twitter:title > <title>)
  const ogTitle = extractMetaTag(html, 'og:title');
  const twitterTitle = extractMetaTag(html, 'twitter:title');
  const titleTag = extractTitleTag(html);
  metadata.title = ogTitle || twitterTitle || titleTag;

  // Extract description (priority: og:description > twitter:description > meta description)
  const ogDescription = extractMetaTag(html, 'og:description');
  const twitterDescription = extractMetaTag(html, 'twitter:description');
  const metaDescription = extractMetaTag(html, 'description');
  metadata.description = ogDescription || twitterDescription || metaDescription;

  // Extract image (priority: og:image > twitter:image)
  const ogImage = extractMetaTag(html, 'og:image');
  const twitterImage = extractMetaTag(html, 'twitter:image');
  const imageUrl = ogImage || twitterImage;
  if (imageUrl) {
    metadata.image = resolveUrl(imageUrl, url);
  }

  // Extract favicon
  const faviconHref = extractFavicon(html);
  if (faviconHref) {
    metadata.favicon = resolveUrl(faviconHref, url);
  }

  return metadata;
}

/**
 * Extract meta tag content by property or name
 */
function extractMetaTag(html: string, property: string): string | undefined {
  // Try property attribute (Open Graph)
  const propertyRegex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
  const propertyMatch = html.match(propertyRegex);
  if (propertyMatch) return propertyMatch[1];

  // Try name attribute (standard meta tags)
  const nameRegex = new RegExp(`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
  const nameMatch = html.match(nameRegex);
  if (nameMatch) return nameMatch[1];

  // Try reversed order (content before property/name)
  const reversedPropertyRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+property=["']${property}["']`, 'i');
  const reversedPropertyMatch = html.match(reversedPropertyRegex);
  if (reversedPropertyMatch) return reversedPropertyMatch[1];

  const reversedNameRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+name=["']${property}["']`, 'i');
  const reversedNameMatch = html.match(reversedNameRegex);
  if (reversedNameMatch) return reversedNameMatch[1];

  return undefined;
}

/**
 * Extract title from <title> tag
 */
function extractTitleTag(html: string): string | undefined {
  const titleRegex = /<title[^>]*>([^<]+)<\/title>/i;
  const match = html.match(titleRegex);
  return match ? match[1].trim() : undefined;
}

/**
 * Extract favicon URL from <link> tags
 */
function extractFavicon(html: string): string | undefined {
  // Look for icon link tags
  const iconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i;
  const iconMatch = html.match(iconRegex);
  if (iconMatch) return iconMatch[1];

  // Look for reversed order
  const reversedRegex = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i;
  const reversedMatch = html.match(reversedRegex);
  if (reversedMatch) return reversedMatch[1];

  return undefined;
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

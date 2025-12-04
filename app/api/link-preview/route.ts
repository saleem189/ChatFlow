// ================================
// Link Preview API
// ================================
// Fetches Open Graph metadata for URL previews

import { NextRequest, NextResponse } from "next/server";

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

/**
 * POST /api/link-preview
 * Fetch link preview metadata for a URL
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Only allow http/https protocols
    if (!["http:", "https:"].includes(validUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are allowed" },
        { status: 400 }
      );
    }

    // Fetch the URL
    const response = await fetch(validUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Parse Open Graph and meta tags
    const preview: LinkPreviewData = {
      url: validUrl.toString(),
    };

    // Extract Open Graph tags
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);

    // Extract standard meta tags as fallback
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const metaDescriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const metaImageMatch = html.match(/<meta\s+name=["']image["']\s+content=["']([^"']+)["']/i);

    // Set preview data (prefer Open Graph, fallback to standard meta)
    preview.title = ogTitleMatch?.[1] || titleMatch?.[1] || validUrl.hostname;
    preview.description = ogDescriptionMatch?.[1] || metaDescriptionMatch?.[1] || "";
    preview.image = ogImageMatch?.[1] || metaImageMatch?.[1] || "";
    preview.siteName = ogSiteNameMatch?.[1] || validUrl.hostname;

    // Make image URL absolute if it's relative
    if (preview.image && !preview.image.startsWith("http")) {
      try {
        preview.image = new URL(preview.image, validUrl.origin).toString();
      } catch {
        preview.image = "";
      }
    }

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i);
    if (faviconMatch?.[1]) {
      try {
        preview.favicon = new URL(faviconMatch[1], validUrl.origin).toString();
      } catch {
        preview.favicon = `${validUrl.origin}/favicon.ico`;
      }
    } else {
      preview.favicon = `${validUrl.origin}/favicon.ico`;
    }

    return NextResponse.json({ preview });
  } catch (error: unknown) {
    const { getService } = await import('@/lib/di');
    const logger = await getService<import('@/lib/logger/logger.interface').ILogger>('logger');
    logger.error('Error fetching link preview', error, {
      component: 'LinkPreviewAPI',
    });
    
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (errorObj.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout" },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch link preview", details: errorObj.message },
      { status: 500 }
    );
  }
}


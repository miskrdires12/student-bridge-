/**
 * Student Bridge — Autonomous Cloudflare Edge Application Worker
 * Zero Vercel, Zero Supabase. 100% Hosted on Cloudflare Pages.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Set CORS headers for all requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          platform: "Cloudflare Pages & Edge Workers",
          domain: url.hostname,
          time: new Date().toISOString(),
          dependencies: {
            supabase: "none (completely unlinked)",
            vercel: "none (completely unlinked)",
            cloudflareR2: "active",
            cloudflareEdge: "active"
          }
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Image Proxy endpoint to bypass any browser CORS restrictions when packaging ZIPs or downloading single photos
    if (url.pathname === "/api/proxy-photo") {
      const targetPhotoUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "photo.jpg";
      if (!targetPhotoUrl) {
        return new Response("Missing url param", { status: 400 });
      }

      try {
        const photoRes = await fetch(targetPhotoUrl, {
          headers: {
            "User-Agent": "StudentBridge-Worker/1.0"
          }
        });
        if (!photoRes.ok) {
          return new Response("Failed to fetch photo from storage", { status: photoRes.status });
        }

        const headers = new Headers(photoRes.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        if (url.searchParams.get("download") === "1") {
          headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        }

        return new Response(photoRes.body, {
          status: 200,
          headers
        });
      } catch (err) {
        return new Response("Proxy error: " + err.message, { status: 500 });
      }
    }

    // Handle static asset delivery or SPA fallback
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      
      // If asset exists, return it with optimal caching
      if (assetResponse.status !== 404) {
        const resHeaders = new Headers(assetResponse.headers);
        resHeaders.set("Access-Control-Allow-Origin", "*");
        
        // Cache data files for 10 minutes
        if (url.pathname.startsWith("/data/")) {
          resHeaders.set("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
        }
        
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers: resHeaders
        });
      }

      // If 404 and it's a SPA route (not an asset with a file extension), return index.html
      if (!url.pathname.includes(".") || url.pathname === "/") {
        const indexRequest = new Request(new URL("/index.html", request.url), request);
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        const resHeaders = new Headers(indexResponse.headers);
        resHeaders.set("Access-Control-Allow-Origin", "*");
        return new Response(indexResponse.body, {
          status: 200,
          headers: resHeaders
        });
      }

      return assetResponse;
    } catch (err) {
      return new Response("Edge Error: " + err.message, {
        status: 500,
        headers: { "Content-Type": "text/plain", ...corsHeaders }
      });
    }
  }
};

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/login",
  "/api/forgotPassword",
  "/api/resetPassword",
  "/api/generateForgotPasswordOtpByLoginId",
  "/api/generateForgotPasswordOtp",
  "/api/getEmailByLoginId",
  "/api/users/verify-otp",
  "/api/users/set-password",
  "/api/transcription-generate", // worker uses Bearer token, not session cookie
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/logout",
  "/api/auth/metadata",
];

const API_SECRET_KEY =
  process.env.API_SECRET_KEY ||
  (process.env.NODE_ENV === "production"
    ? null
    : "dev_fallback_secret_key_only_for_local_testing_12345");

if (!API_SECRET_KEY) {
  throw new Error("CRITICAL: API_SECRET_KEY environment variable is required in production!");
}

function applySecurityHeaders(response, nonce = "") {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Strip Server and X-Powered-By headers to prevent information leakage
  response.headers.delete("Server");
  response.headers.delete("X-Powered-By");

  const isProd = process.env.NODE_ENV === "production";

  const backendUrl = process.env.BACKEND_API_BASE_URL || "http://localhost:3000";
  let backendOrigin = "";
  if (backendUrl) {
    try {
      backendOrigin = new URL(backendUrl).origin;
    } catch (_) {}
  }

  const cspValue =
    "default-src 'self'; " +
    (nonce
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}; `
      : `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}; `) +
    (nonce
      ? `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; `
      : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ") +
    "img-src 'self' data: blob: https://images.pexels.com https://commondatastorage.googleapis.com https://storage.googleapis.com https://*.s3.amazonaws.com https://*.amazonaws.com; " +
    "media-src 'self' blob: data: https://*.s3.amazonaws.com https://*.amazonaws.com https://storage.googleapis.com; " +
    `connect-src 'self'${isProd ? "" : " ws: wss:"} ${backendOrigin || "http://localhost:3000"}; ` +
    "frame-ancestors 'self'; " +
    "worker-src 'self' blob:; " +
    "base-uri 'self'; " +
    "form-action 'self';";
  response.headers.set("Content-Security-Policy", cspValue);

  return response;
}

export async function proxy(req) {
  const { pathname } = req.nextUrl;
  const nonce = btoa(crypto.randomUUID()).replace(/=/g, "");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  
  // Prevent infinite rewrite loops when frontend is run on the backend's port (3000)
  const host = req.headers.get("host") || "";
  const backendUrl = process.env.BACKEND_API_BASE_URL || "http://localhost:3000";
  try {
    const backendHost = new URL(backendUrl).host;
    if (host === backendHost && pathname.startsWith("/api")) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "SelfProxyError",
            message: `Infinite proxy loop detected! The frontend is running on the same port (${host}) as the BACKEND_API_BASE_URL (${backendUrl}). Please ensure you run the frontend on a different port (e.g. port 5000 via 'npm run dev' or 'next dev -p 5000') and run the backend API on port 3000.`
          },
          { status: 508 }
        ),
        nonce
      );
    }
  } catch (e) {
    // Ignore invalid URL
  }

  // Allow public routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return applySecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      nonce
    );
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/dashboard")) {
    const authHeader = req.headers.get("authorization");
    const authQuery = req.nextUrl.searchParams.get("auth");
    const apiToken = process.env.API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;

    const hasValidToken = (authHeader && authHeader.startsWith("Bearer ") && authHeader.split(" ")[1] === apiToken) ||
                          (authQuery && authQuery === apiToken);

    if (hasValidToken) {
      if (apiToken) {
        requestHeaders.set("Authorization", `Bearer ${apiToken}`);
      }
      return applySecurityHeaders(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        }),
        nonce
      );
    }

    const token = req.cookies.get("sessionToken")?.value;

    if (!token) {
      if (pathname.startsWith("/api")) {
        return applySecurityHeaders(
          NextResponse.json(
            { message: "Unauthorized: No session" },
            { status: 401 }
          ),
          nonce
        );
      }
      return applySecurityHeaders(NextResponse.redirect(new URL("/", req.url)), nonce);
    }

    try {
      const secret = new TextEncoder().encode(API_SECRET_KEY); // Ensure same secret
      const { payload } = await jwtVerify(token, secret);

      requestHeaders.set("x-user-id", String(payload.userId));
      requestHeaders.set("x-user-role", payload.userRole || "");
      // Include licensed modules from JWT so downstream APIs can enforce licensing
      try {
        const licensed = payload?.licensedModules || [];
        requestHeaders.set("x-licensed-modules", JSON.stringify(licensed));
      } catch {
        /* ignore */
      }

      // Inject the authorization header so the browser doesn't have to send/expose it!
      const apiToken = process.env.API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
      if (apiToken) {
        requestHeaders.set("Authorization", `Bearer ${apiToken}`);
      }
      requestHeaders.set("loggedinuserid", String(payload.userId));

      return applySecurityHeaders(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        }),
        nonce
      );
    } catch (err) {
      console.warn("JWT verify failed in middleware:", err?.message || err);
      if (pathname.startsWith("/api")) {
        return applySecurityHeaders(
          NextResponse.json(
            { message: "Unauthorized: Invalid session" },
            { status: 401 }
          ),
          nonce
        );
      }
      return applySecurityHeaders(NextResponse.redirect(new URL("/", req.url)), nonce);
    }
  }

  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    nonce
  );
}

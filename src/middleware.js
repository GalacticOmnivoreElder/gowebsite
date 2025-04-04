import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and API routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/platform")) {
    return NextResponse.next();
  }

  // Get the Firebase ID token from the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Call verify endpoint with the Firebase token
    const response = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      headers: {
        Authorization: authHeader, // Pass the entire auth header
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const permissions = await response.json();

    // Check permissions based on route
    if (pathname.startsWith("/admin") && !permissions.permissions.isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      pathname.startsWith("/platform") &&
      !permissions.permissions.canAccessPackages
    ) {
      return NextResponse.redirect(new URL("/pricing", request.url));
    }

    // Clone the request headers and add permissions
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-permissions", JSON.stringify(permissions));

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/platform/:path*"],
};

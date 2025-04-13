import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Token from environment variables, should match the one in the auth route
const AUTH_TOKEN = process.env.AUTH_TOKEN_VALUE || "";

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Check if the request is for the login page
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // Check if the auth token cookie exists and matches our hardcoded token
  const authToken = request.cookies.get("auth-token")?.value;
  const isAuthenticated = authToken === AUTH_TOKEN;

  // Allow API requests to pass through
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // If the user is not authenticated and not on the login page, redirect to login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If the user is authenticated and on the login page, redirect to the home page
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|images/).*)",
  ],
};

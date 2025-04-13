import { NextResponse } from "next/server";

// Credentials and token from environment variables
const VALID_EMAIL = process.env.AUTH_EMAIL || "";
const VALID_PASSWORD = process.env.AUTH_PASSWORD || "";
const AUTH_TOKEN = process.env.AUTH_TOKEN_VALUE || "";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    // Create a new response
    const response = NextResponse.json({ success: true });

    // Set a cookie with the hardcoded token
    response.cookies.set({
      name: "auth-token",
      value: AUTH_TOKEN,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // For a permanent cookie that never expires, we set a date far in the future
      maxAge: 10 * 365 * 24 * 60 * 60, // 10 years
    });

    return response;
  }

  return NextResponse.json(
    { success: false, message: "Invalid credentials" },
    { status: 401 }
  );
}

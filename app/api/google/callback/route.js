import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const code = req.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.json(tokens, { status: 400 });
    }

    // 🔥 TEMPORARY: Use an existing user from DB for now
    const user = await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json(
        { error: "No user exists in DB. Create one first." },
        { status: 400 }
      );
    }

    await prisma.wearableToken.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "google_fit",
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        userId: user.id,
        provider: "google_fit",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(
  process.env.NEXT_PUBLIC_APP_URL + "/dashboard"
);
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

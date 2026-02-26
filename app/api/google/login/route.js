// app/api/google/login/route.js

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const googleAuthUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/fitness.sleep.read",
        "https://www.googleapis.com/auth/fitness.heart_rate.read",
        "https://www.googleapis.com/auth/fitness.body_temperature.read",
        "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
        "https://www.googleapis.com/auth/fitness.blood_glucose.read",
        "https://www.googleapis.com/auth/fitness.blood_pressure.read",
        "https://www.googleapis.com/auth/fitness.body.read",
        "https://www.googleapis.com/auth/fitness.activity.read",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: userId, // 🔥 IMPORTANT
    });

  return NextResponse.redirect(googleAuthUrl);
}
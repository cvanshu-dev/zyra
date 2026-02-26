import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.body.read",
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.heart_rate.read",
      "https://www.googleapis.com/auth/fitness.blood_pressure.read",
      "https://www.googleapis.com/auth/fitness.blood_glucose.read",
      "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
      "https://www.googleapis.com/auth/fitness.body_temperature.read",
      // Note: `fitness.respiratory_rate.read` is not accepted by Google's
      // OAuth consent in many projects and can cause `invalid_scope`.
      // It's omitted to avoid login failures. Re-add only after verifying
      // the scope in Google Cloud console if required.
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}

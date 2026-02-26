import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = await prisma.wearableToken.findFirst();

    if (!token) {
      return NextResponse.json(
        { connected: false },
        { status: 401 }
      );
    }

    // Optional expiry check
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      return NextResponse.json(
        { connected: false },
        { status: 401 }
      );
    }

    return NextResponse.json({ connected: true });

  } catch (err) {
    return NextResponse.json(
      { connected: false },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessions = await prisma.healthSession.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log("HISTORY SESSIONS:", sessions);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
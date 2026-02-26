import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      period,
      vitalsSnapshot,
      initialSummary,
      initialRisk,
      followUpQuestions,
      followUpAnswers,
      finalAssessment,
      finalRisk,
    } = body;

    const userId = "11111111-1111-1111-1111-111111111111";

    const session = await prisma.healthSession.create({
      data: {
        userId,
        period,
        vitalsSnapshot,
        initialSummary,
        initialRisk,
        followUpQuestions,
        followUpAnswers,
        finalAssessment,
        finalRisk,
      },
    });

    return NextResponse.json({ success: true, id: session.id });
  } catch (error) {
    console.error("Finalize error:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 }
    );
  }
}
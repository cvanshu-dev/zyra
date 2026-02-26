import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = await prisma.wearableToken.findFirst();

    if (!token) {
      return NextResponse.json(
        { error: "No wearable connected" },
        { status: 400 }
      );
    }

    const dataTypes = [
      "com.google.step_count.delta",
      "com.google.heart_rate.bpm",
      "com.google.calories.expended",
      "com.google.active_minutes",
      "com.google.distance.delta",
      "com.google.sleep.segment",
      "com.google.weight",
      "com.google.blood_pressure"
    ];

    const fitRes = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: dataTypes.map((type) => ({
            dataTypeName: type,
          })),
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: Date.now() - 604800000 // 7 days
,
          endTimeMillis: Date.now(),
        }),
      }
    );

    const fitData = await fitRes.json();

    const datasets = fitData.bucket?.[0]?.dataset || [];

    const metrics = {
      steps: null,
      heart_rate_avg: null,
      calories: null,
      active_minutes: null,
      distance: null,
      sleep_minutes: null,
      weight: null,
      blood_pressure: null,
    };

    datasets.forEach((dataset) => {
      const points = dataset.point || [];

      if (points.length === 0) return;

      switch (dataset.dataTypeName) {
        case "com.google.step_count.delta":
          metrics.steps = points[0]?.value?.[0]?.intVal || null;
          break;

        case "com.google.heart_rate.bpm":
          const hrValues = points
            .map((p) => p.value?.[0]?.fpVal)
            .filter(Boolean);
          if (hrValues.length > 0) {
            metrics.heart_rate_avg =
              hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
          }
          break;

        case "com.google.calories.expended":
          metrics.calories = points[0]?.value?.[0]?.fpVal || null;
          break;

        case "com.google.active_minutes":
          metrics.active_minutes =
            points[0]?.value?.[0]?.intVal || null;
          break;

        case "com.google.distance.delta":
          metrics.distance =
            points[0]?.value?.[0]?.fpVal || null;
          break;

        case "com.google.sleep.segment":
          metrics.sleep_minutes = points.length;
          break;

        case "com.google.weight":
          metrics.weight =
            points[0]?.value?.[0]?.fpVal || null;
          break;

        case "com.google.blood_pressure":
          metrics.blood_pressure =
            points[0]?.value?.[0]?.fpVal || null;
          break;
      }
    });

    return NextResponse.json({ metrics });

  } catch (error) {
    console.error("Analyze Error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}

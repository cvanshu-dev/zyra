import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});



function extractJSON(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  return rawText
    .slice(start, end + 1)
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .trim();
}
function normalizeVitals(vitals, period) {
  if (period === "week" || period === "month") {
    const breakdown = Array.isArray(vitals?.breakdown)
      ? vitals.breakdown
      : [];

    const latestDay = breakdown[breakdown.length - 1] || {};

    const avgHR =
      breakdown
        .map(d => d?.heart_rate_avg)
        .filter(v => typeof v === "number")
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

    const avgSleep =
      breakdown
        .map(d => d?.sleep_hours)
        .filter(v => typeof v === "number")
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

    return {
      periodType: period,

      // Latest day values
      steps: latestDay?.steps ?? null,
      heartRate: latestDay?.heart_rate_avg ?? null,
      sleep: latestDay?.sleep_hours ?? null,
      activeMinutes: latestDay?.active_minutes ?? null,
      calories: latestDay?.calories ?? null,

      // Period averages
      average_steps: vitals?.average_steps ?? null,
      average_heart_rate: avgHR,
      average_sleep: avgSleep,

      systolic: latestDay?.systolic_bp ?? null,
      diastolic: latestDay?.diastolic_bp ?? null,
      glucose: latestDay?.glucose ?? null,
      temperature: latestDay?.temperature ?? null,

      breakdown,
    };
  }

  // TODAY or YESTERDAY (single day)
  return {
    periodType: period,

    steps: vitals?.steps ?? null,
    heartRate: vitals?.heart_rate_avg ?? null,
    sleep: vitals?.sleep_segments ?? null,
    activeMinutes: vitals?.active_minutes ?? null,
    calories: vitals?.calories ?? null,

    average_steps: vitals?.average_steps ?? null,
    average_heart_rate: vitals?.average_heart_rate ?? null,
    average_sleep: vitals?.average_sleep ?? null,

    systolic: vitals?.systolic_bp ?? null,
    diastolic: vitals?.diastolic_bp ?? null,
    glucose: vitals?.glucose ?? null,
    temperature: vitals?.temperature ?? null,

    breakdown: null,
  };
}
export async function POST(req) {
  try {
    const body = await req.json();
    const { vitals, answers, period, allowFollowUp, sessionId } = body;
   

    const todayKey = new Date().toISOString().split("T")[0];

    if (!vitals) {
      return NextResponse.json(
        { error: "Vitals data is required" },
        { status: 400 }
      );
    }

    const userId = "11111111-1111-1111-1111-111111111111";// 🔥 Replace with real auth later

    // =============================
    // Cache Check
    // =============================
  
    // =============================
    // Preprocess Data
    // =============================
function buildIntelligenceSignals(data) {
  return {
    steps: data.steps,
    averageSteps: data.average_steps,

    heartRate: data.heartRate,
    averageHeartRate: data.average_heart_rate,

    sleep: data.sleep,
    averageSleep: data.average_sleep,

    systolic: data.systolic,
    diastolic: data.diastolic,
    glucose: data.glucose,
    temperature: data.temperature,

    activeMinutes: data.activeMinutes,
    calories: data.calories,
  };
}
const normalized = normalizeVitals(vitals, period);
const signals = buildIntelligenceSignals(normalized);

// 🔥 Add deviation calculation
function percentDeviation(today, baseline) {
  if (today == null || baseline == null) return null;
  if (baseline === 0) return null;
  return Number(((today - baseline) / baseline * 100).toFixed(1));
}

let deviations = {};

if (normalized.periodType === "week" || normalized.periodType === "month") {
  deviations = {
    steps: percentDeviation(normalized.steps, normalized.average_steps),
    heartRate: percentDeviation(normalized.heartRate, normalized.average_heart_rate),
    sleep: percentDeviation(normalized.sleep, normalized.average_sleep),
  };
} else {
  deviations = {
    steps: percentDeviation(normalized.steps, normalized.average_steps),
    heartRate: percentDeviation(normalized.heartRate, normalized.average_heart_rate),
    sleep: percentDeviation(normalized.sleep, normalized.average_sleep),
  };
}

// 🔥 Light signal hints (guiding AI)


if (deviations.heartRate && deviations.heartRate > 10)
  signalHints.push("Heart rate elevated relative to baseline");

if (deviations.sleep && deviations.sleep < -15)
  signalHints.push("Sleep reduction detected");

if (normalized.glucose && normalized.glucose > 140)
  signalHints.push("Glucose elevation detected");

if (normalized.systolic && normalized.systolic > 135)
  signalHints.push("Elevated blood pressure reading");

const intelligencePacket = {
  metrics: normalized,
  baseline_deviations: deviations,
  period,
  has_follow_up_answers: !!answers
};

const prompt = `
You are an advanced AI preventive health intelligence engine.

You are NOT a wellness chatbot.
You produce structured clinical-style reasoning.

The analysis period is: ${normalized.periodType}

Interpret the data differently based on period:

- today/yesterday → acute short-term physiological state.
- week → consistency, variability, recovery stability.
- month → recurring patterns, long-term strain, sustainability.

DATA:
${JSON.stringify(intelligencePacket, null, 2)}

STRICT REQUIREMENTS:

1. The summary must be detailed (minimum 5–7 sentences).
2. Explain cause-and-effect relationships.
3. Discuss interaction between sleep, heart rate, glucose, and blood pressure.
4. Explain deviation impact, not just presence.
5. Avoid generic advice like "stay hydrated".
6. Provide physiologically grounded reasoning.
7. Do not restate raw numbers directly.

Return STRICT JSON:

{
  "summary": "",
  "risk_level": "LOW | MODERATE | HIGH",
  "analysis": {
    "physiological_state": "Detailed explanation (3-5 sentences)",
    "pattern_detection": "Explain cross-metric relationships",
    "risk_reasoning": "Explain why risk is LOW/MODERATE/HIGH",
    "preventive_guidance": "Specific, non-generic prevention actions"
  },
  "follow_up_questions": [],
  "final_assessment": "Clear forward-looking clinical-style conclusion"
}

If has_follow_up_answers is false AND uncertainty exists,
generate exactly 3 targeted follow-up questions.

If has_follow_up_answers is true,
follow_up_questions must be [].

Output only valid JSON.
`;

    // =============================
    // Call GROQ
    // =============================
    let completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a structured clinical health intelligence engine. Output only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let rawText =
      completion.choices?.[0]?.message?.content || "";

    let cleaned = extractJSON(rawText);

    if (!cleaned) {
      // Retry once
      const retry = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Return ONLY valid JSON. No text outside JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      rawText = retry.choices?.[0]?.message?.content || "";
      cleaned = extractJSON(rawText);

      if (!cleaned) {
        return NextResponse.json(
          { error: "AI failed JSON twice" },
          { status: 500 }
        );
      }
    }

 let parsed = JSON.parse(cleaned);

// 🔥 DEMO USER (TEMP)


// Ensure user exists before any session operation
await prisma.user.upsert({
  where: { id: userId },
  update: {},
  create: {
    id: userId,
    clerkUserId: "demo-clerk",
    email: "demo@carenex.com",
    role: "PATIENT",
  },
});

// =============================
// Follow-up Detection
// =============================
const hasAnswers =
  answers &&
  typeof answers === "object" &&
  Object.values(answers).some(
    (v) => v && v.trim() !== ""
  );

// =============================
// FINAL STAGE (User answered follow-ups)
// =============================

// =============================
// INITIAL STAGE (Create Session)
// =============================

    // =============================
    // Validate Structure
    // =============================
    if (!parsed.summary || !parsed.risk_level) {
      return NextResponse.json(
        { error: "Incomplete AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.follow_up_questions)) {
      parsed.follow_up_questions = [];
    }

    // =============================
    // Cache Save (Non-Today Only)
    // =============================
    if (period !== "today") {
      await prisma.healthAssessment.upsert({
        where: {
          userId_period_dateKey: {
            userId,
            period,
            dateKey: todayKey,
          },
        },
        update: {},
        create: {
          userId,
          period,
          dateKey: todayKey,
          vitals,
          summary: parsed.summary,
          riskLevel: parsed.risk_level,
          analysis: parsed.analysis,
          questions: parsed.follow_up_questions,
          answers: answers || {},
          finalAssessment: parsed.final_assessment || "",
        },
      });
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("AI Route Fatal Error:", error);
    return NextResponse.json(
      { error: "AI analysis failed" },
      { status: 500 }
    );
  }
}
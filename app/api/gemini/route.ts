import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt cannot be empty" },
        { status: 400 }
      );
    }

    // ✅ Use simple text input, not role-based structure
    const systemPrompt = `
You are a precise medical symptom checker.
Your response must be short, factual, and formatted exactly as follows:

**Possible Diseases (Top 3):**
1. Disease – Probability%
2. Disease – Probability%
3. Disease – Probability%

**Primary Diagnosis:** One concise line  
**Recommended Next Step:** One sentence  
**Urgency Level:** Low / Moderate / High
    `;

    const fullPrompt = `${systemPrompt}\n\nUser symptoms: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

import OpenAI from "openai";
export async function POST(req) {
  const data = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
  Here is wearable variation result:
  ${JSON.stringify(data, null, 2)}

  Generate:
  1) A simple summary
  2) 3 follow-up questions
  3) Suggested next steps
  `;
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return Response.json(response.choices[0].message);
}

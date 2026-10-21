import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Body = z.object({ firstMessage: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  console.log("title request");
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Write a 4-word title for this conversation." },
      { role: "user", content: parsed.data.firstMessage },
    ],
  });
  return Response.json({ title: res.choices[0].message.content });
}

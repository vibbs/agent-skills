"use client";
import { useEffect, useState } from "react";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

type Message = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    supabase
      .from("messages")
      .select("role, content")
      .order("created_at")
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, []);

  async function send() {
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are a friendly study buddy." }, ...next],
    });
    const reply = res.choices[0].message.content ?? "";
    setMessages([...next, { role: "assistant", content: reply }]);
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("messages").insert([
      { user_id: user.user?.id, role: "user", content: input },
      { user_id: user.user?.id, role: "assistant", content: reply },
    ]);
  }

  return (
    <div>
      {messages.map((m, i) => (
        <p key={i}>
          <b>{m.role}:</b> {m.content}
        </p>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}

"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");

  async function sendLink() {
    await supabase.auth.signInWithOtp({ email });
  }

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button onClick={sendLink}>Send magic link</button>
    </div>
  );
}

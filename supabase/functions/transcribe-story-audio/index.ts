import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  let storyId: string | null = null;

  try {
    const body = await req.json();
    storyId = body.storyId;
    const audioUrl = body.audioUrl;

    if (!storyId || !audioUrl) {
      return new Response(JSON.stringify({ error: "storyId and audioUrl are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("stories")
      .update({ transcription_status: "processing" })
      .eq("id", storyId);

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio: ${audioRes.status}`);
    }
    const audioBlob = await audioRes.blob();

    const formData = new FormData();
    formData.append("file", audioBlob, "memo.m4a");
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      throw new Error(`OpenAI error ${whisperRes.status}: ${errBody}`);
    }

    const transcript = (await whisperRes.text()).trim();

    await supabase
      .from("stories")
      .update({
        transcript_text: transcript,
        transcription_status: "done",
        transcription_error: null,
        transcribed_at: new Date().toISOString(),
      })
      .eq("id", storyId);

    return new Response(JSON.stringify({ ok: true, transcript }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (storyId) {
      await supabase
        .from("stories")
        .update({
          transcription_status: "failed",
          transcription_error: message.slice(0, 500),
        })
        .eq("id", storyId);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

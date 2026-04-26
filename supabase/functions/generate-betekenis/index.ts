import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WordInput {
  id: number;
  word: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { words }: { words: WordInput[] } = await req.json();

    if (!words || words.length === 0) {
      return new Response(
        JSON.stringify({ error: "No words provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAiKey = Deno.env.get("OPENAI");
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordList = words.map((w) => `${w.id}\t${w.word}`).join("\n");

    const prompt = `Here is a list of Flemish Dutch words (id<TAB>word). For each word, write a short child-friendly definition suitable for children younger than 12.

Rules:
- NEVER start with the word itself, "Dit woord betekent:", "Dit betekent:", or any similar prefix
- Write ONLY the bare definition — just the meaning, nothing else before it
- Good example for "ondervraagde": "iemand die vragen krijgt om iets te vertellen"
- Use simple, everyday Dutch words — no difficult vocabulary
- Keep it short: 1 sentence maximum
- Do NOT repeat or reuse the word in the definition

Return ONLY a tab-separated list with the same id followed by the bare definition, one per line. No extra text, no headers, no prefixes.

Words:
${wordList}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || "";

    const results: Record<number, string> = {};
    for (const line of text.split("\n")) {
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const id = parseInt(parts[0].trim(), 10);
        const definition = parts.slice(1).join("\t").trim();
        if (!isNaN(id) && definition) {
          results[id] = definition.replace(/^dit woord betekent:\s*/i, "").replace(/^dit betekent:\s*/i, "");
        }
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-betekenis error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

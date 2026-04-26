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

    if (!Array.isArray(words) || words.length === 0) {
      return new Response(
        JSON.stringify({ error: "Words array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordList = words.map((w) => w.word).join("\n");

    const systemPrompt = `Je bent een taalkundige die definities schrijft voor Vlaamse kinderen jonger dan 12 jaar. Schrijf eenvoudige, begrijpelijke definities. Gebruik geen moeilijke woorden. Geef voor elk woord precies één definitie op één regel. Begin de definitie NOOIT met het woord zelf (dus niet "kat is ..." of "kat: een dier ..."). Beschrijf het woord zonder het te herhalen aan het begin. Antwoord altijd in het formaat: woord: definitie`;

    const userPrompt = `Geef een eenvoudige definitie voor elk van deze Vlaamse woorden, geschikt voor kinderen jonger dan 12 jaar. Gebruik geen moeilijke woorden. Begin de definitie NOOIT met het woord zelf. Antwoord precies in het formaat "woord: definitie", één per regel, in dezelfde volgorde als de lijst:\n\n${wordList}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ error: errorData.error?.message || "OpenAI API error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";

    // Parse "woord: definitie" lines into a map
    const results: Record<number, string> = {};
    const lines = content.split("\n").filter((l: string) => l.trim());

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const parsedWord = line.slice(0, colonIdx).trim().toLowerCase();
      const definitie = line.slice(colonIdx + 1).trim()
        .replace(/^dit woord betekent:\s*/i, "")
        .replace(/^dit betekent:\s*/i, "");

      const match = words.find(
        (w) => w.word.toLowerCase() === parsedWord
      );
      if (match && definitie) {
        results[match.id] = definitie;
      }
    }

    // Fallback: if some words couldn't be matched by name, try positional matching
    if (Object.keys(results).length < words.length) {
      const parsedLines = lines.filter((l: string) => l.includes(":"));
      words.forEach((w, idx) => {
        if (results[w.id] === undefined && parsedLines[idx]) {
          const colonIdx = parsedLines[idx].indexOf(":");
          const definitie = parsedLines[idx].slice(colonIdx + 1).trim()
            .replace(/^dit woord betekent:\s*/i, "")
            .replace(/^dit betekent:\s*/i, "");
          if (definitie) results[w.id] = definitie;
        }
      });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating betekenis:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

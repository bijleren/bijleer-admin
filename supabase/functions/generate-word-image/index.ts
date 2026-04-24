import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ImageStyle = "icon" | "illustration" | "photo";

function buildPrompt(word: string, style: ImageStyle): string {
  switch (style) {
    case "icon":
      return `A single clean icon representing the Dutch word "${word}". Minimal flat vector icon, one simple shape or object, solid colors, white background, perfectly centered. Absolutely no text of any kind, no words, no letters, no numbers, no labels, no captions, no watermarks, no drawing hands, no pencils, no sketching elements, no decorative borders. The icon should be immediately recognizable as the concept "${word}".`;

    case "illustration":
      return `A clear flat illustration showing the meaning of the Dutch word "${word}". Realistic everyday scene or object, flat design style, soft colors, white background. Absolutely no text of any kind, no words, no letters, no numbers, no labels, no captions, no watermarks, no drawing hands, no pencils, no sketching elements, no cartoonish features. The scene should unambiguously represent the concept "${word}".`;

    case "photo":
      return `A photorealistic image that clearly shows the meaning of the Dutch word "${word}". Clean composition, natural lighting, neutral or white background. Absolutely no text of any kind, no words, no letters, no numbers, no labels, no captions, no watermarks, no drawing hands, no pencils, no sketching elements. The subject should be the single most recognizable visual representation of "${word}".`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { word, style = "illustration" } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "Word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["icon", "illustration", "photo"].includes(style)) {
      return new Response(
        JSON.stringify({ error: "Style must be one of: icon, illustration, photo" }),
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

    const prompt = buildPrompt(word, style as ImageStyle);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
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
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image URL returned from OpenAI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

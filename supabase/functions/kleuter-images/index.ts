import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // Check admin
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!adminRow) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // POST /kleuter-images?action=upload  — multipart form: file, word, image_type, label?
    if (req.method === "POST" && action === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const word = formData.get("word") as string | null;
      const imageType = formData.get("image_type") as string | null;
      const label = formData.get("label") as string | null;

      if (!file || !word || !imageType) {
        return json({ error: "Missing file, word or image_type" }, 400);
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const uid = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const storagePath = `words/${word}/${imageType}_${uid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("images_kleuter")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) return json({ error: uploadError.message }, 500);

      // Get next sort_order
      const { data: existing } = await supabase
        .from("kleuter_word_images")
        .select("sort_order")
        .eq("word", word)
        .eq("image_type", imageType)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextSort = existing && existing.length > 0 ? (existing[0].sort_order + 1) : 0;

      const { data: row, error: insertError } = await supabase
        .from("kleuter_word_images")
        .insert({
          word,
          image_type: imageType,
          storage_path: storagePath,
          label: label || null,
          source_type: "admin",
          school_id: null,
          uploaded_by: user.id,
          sort_order: nextSort,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("images_kleuter").remove([storagePath]);
        return json({ error: insertError.message }, 500);
      }

      return json({ data: row });
    }

    // DELETE /kleuter-images?action=delete  — body: { id, storage_path }
    if (req.method === "DELETE" && action === "delete") {
      const { id, storage_path } = await req.json();
      if (!id || !storage_path) return json({ error: "Missing id or storage_path" }, 400);

      const { error: storageError } = await supabase.storage
        .from("images_kleuter")
        .remove([storage_path]);
      if (storageError) return json({ error: storageError.message }, 500);

      const { error: dbError } = await supabase
        .from("kleuter_word_images")
        .delete()
        .eq("id", id);
      if (dbError) return json({ error: dbError.message }, 500);

      return json({ success: true });
    }

    // PATCH /kleuter-images?action=update  — body: { id, label?, is_active?, sort_order? }
    if (req.method === "PATCH" && action === "update") {
      const { id, ...updates } = await req.json();
      if (!id) return json({ error: "Missing id" }, 400);

      const allowed: Record<string, unknown> = {};
      if ("label" in updates) allowed.label = updates.label;
      if ("is_active" in updates) allowed.is_active = updates.is_active;
      if ("sort_order" in updates) allowed.sort_order = updates.sort_order;

      const { data, error } = await supabase
        .from("kleuter_word_images")
        .update(allowed)
        .eq("id", id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // GET /kleuter-images?action=stats  — image counts per word
    if (req.method === "GET" && action === "stats") {
      const { data, error } = await supabase
        .from("kleuter_word_images")
        .select("word, image_type");

      if (error) return json({ error: error.message }, 500);

      const stats: Record<string, { isolated: number; context: number; general: number }> = {};
      for (const row of data ?? []) {
        if (!stats[row.word]) stats[row.word] = { isolated: 0, context: 0, general: 0 };
        if (row.image_type in stats[row.word]) {
          (stats[row.word] as Record<string, number>)[row.image_type]++;
        }
      }
      return json({ data: stats });
    }

    // GET /kleuter-images?action=list&word=xxx  — all images for a word
    if (req.method === "GET" && action === "list") {
      const word = url.searchParams.get("word");
      if (!word) return json({ error: "Missing word" }, 400);

      const { data, error } = await supabase
        .from("kleuter_word_images")
        .select("*")
        .eq("word", word)
        .order("image_type")
        .order("sort_order");

      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

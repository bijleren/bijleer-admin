import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const todayISO = todayStart.toISOString();
    const yesterdayISO = yesterdayStart.toISOString();

    const count = async (table: string, dateCol: string, from?: string, to?: string) => {
      let q = supabase.from(table).select("*", { count: "exact", head: true });
      if (from) q = q.gte(dateCol, from);
      if (to) q = q.lt(dateCol, to);
      const { count: c, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return c ?? 0;
    };

    const [
      webwijzer_total, webwijzer_yesterday, webwijzer_today,
      webwijzer_logins_total, webwijzer_logins_yesterday, webwijzer_logins_today,
      incidents_total, incidents_yesterday, incidents_today,
      qr_codes_total, qr_codes_yesterday, qr_codes_today,
      qr_views_total, qr_views_yesterday, qr_views_today,
      reading_total, reading_yesterday, reading_today,
      books_total, books_yesterday, books_today,
      book_loans_total, book_loans_yesterday, book_loans_today,
      zoeker_total, zoeker_yesterday, zoeker_today,
      sporen_total, sporen_yesterday, sporen_today,
    ] = await Promise.all([
      count("webwijzer_content", "created_at"),
      count("webwijzer_content", "created_at", yesterdayISO, todayISO),
      count("webwijzer_content", "created_at", todayISO),

      count("webwijzer_access_log", "accessed_at"),
      count("webwijzer_access_log", "accessed_at", yesterdayISO, todayISO),
      count("webwijzer_access_log", "accessed_at", todayISO),

      count("behavior_incidents", "created_at"),
      count("behavior_incidents", "created_at", yesterdayISO, todayISO),
      count("behavior_incidents", "created_at", todayISO),

      count("qr_codes", "created_at"),
      count("qr_codes", "created_at", yesterdayISO, todayISO),
      count("qr_codes", "created_at", todayISO),

      count("qr_views", "viewed_at"),
      count("qr_views", "viewed_at", yesterdayISO, todayISO),
      count("qr_views", "viewed_at", todayISO),

      count("reading_sessions", "created_at"),
      count("reading_sessions", "created_at", yesterdayISO, todayISO),
      count("reading_sessions", "created_at", todayISO),

      count("books", "created_at"),
      count("books", "created_at", yesterdayISO, todayISO),
      count("books", "created_at", todayISO),

      count("book_loans", "created_at"),
      count("book_loans", "created_at", yesterdayISO, todayISO),
      count("book_loans", "created_at", todayISO),

      count("zoeker_search_requests", "created_at"),
      count("zoeker_search_requests", "created_at", yesterdayISO, todayISO),
      count("zoeker_search_requests", "created_at", todayISO),

      count("sporen", "created_at"),
      count("sporen", "created_at", yesterdayISO, todayISO),
      count("sporen", "created_at", todayISO),
    ]);

    return new Response(
      JSON.stringify({
        webwijzer_total, webwijzer_yesterday, webwijzer_today,
        webwijzer_logins_total, webwijzer_logins_yesterday, webwijzer_logins_today,
        incidents_total, incidents_yesterday, incidents_today,
        qr_codes_total, qr_codes_yesterday, qr_codes_today,
        qr_views_total, qr_views_yesterday, qr_views_today,
        reading_total, reading_yesterday, reading_today,
        books_total, books_yesterday, books_today,
        book_loans_total, book_loans_yesterday, book_loans_today,
        zoeker_total, zoeker_yesterday, zoeker_today,
        sporen_total, sporen_yesterday, sporen_today,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

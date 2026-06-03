import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") ?? "overview";

    let data: Record<string, unknown> = {};

    // Determine the most recent event date to use as the anchor for all windows.
    // This ensures stats remain meaningful even when there hasn't been recent activity.
    const { data: latestRow } = await supa
      .from("analytics_events")
      .select("occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestTs: number = latestRow
      ? new Date(latestRow.occurred_at as string).getTime()
      : Date.now();

    // Midnight (UTC) of the latest-event day
    const latestDate = new Date(latestTs);
    latestDate.setUTCHours(0, 0, 0, 0);
    const latestDayStart = latestDate.getTime();

    // Is the latest activity today (within real calendar day)?
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const isLive = latestDayStart >= todayStart.getTime();

    // Windows anchored to latest activity
    const dayAgo  = latestDayStart - 86400000;       // day before latest
    const weekAgo = latestTs       - 86400000 * 7;
    const day30   = latestTs       - 86400000 * 30;
    const day14   = latestTs       - 86400000 * 14;

    if (endpoint === "overview") {
      const [todayRows, yesterdayRows, weekRows, totalEvents] = await Promise.all([
        supa.from("analytics_events").select("device_id")
          .gte("occurred_at", new Date(latestDayStart).toISOString()),
        supa.from("analytics_events").select("device_id")
          .gte("occurred_at", new Date(dayAgo).toISOString())
          .lt("occurred_at", new Date(latestDayStart).toISOString()),
        supa.from("analytics_events").select("device_id")
          .gte("occurred_at", new Date(weekAgo).toISOString()),
        supa.from("analytics_events").select("id", { count: "estimated", head: true }),
      ]);

      const todayDevices     = new Set((todayRows.data     ?? []).map((r: { device_id: string }) => r.device_id)).size;
      const yesterdayDevices = new Set((yesterdayRows.data ?? []).map((r: { device_id: string }) => r.device_id)).size;
      const weekDevices      = new Set((weekRows.data      ?? []).map((r: { device_id: string }) => r.device_id)).size;

      data = {
        todayActiveDevices:     todayDevices,
        yesterdayActiveDevices: yesterdayDevices,
        weekActiveDevices:      weekDevices,
        totalEvents:            totalEvents.count ?? 0,
        // Let the UI know whether "today" refers to the real today or a past date
        latestActivityDate: new Date(latestDayStart).toISOString().slice(0, 10),
        isLive,
      };
    }

    else if (endpoint === "daily_active_devices") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("occurred_at, device_id")
        .gte("occurred_at", new Date(day30).toISOString())
        .order("occurred_at", { ascending: true });

      const byDay: Record<string, Set<string>> = {};
      for (const row of rows ?? []) {
        const day = (row.occurred_at as string).slice(0, 10);
        if (!byDay[day]) byDay[day] = new Set();
        byDay[day].add(row.device_id as string);
      }
      data = {
        daily: Object.entries(byDay)
          .map(([day, devices]) => ({ day, devices: devices.size }))
          .sort((a, b) => a.day.localeCompare(b.day)),
      };
    }

    else if (endpoint === "exercise_popularity") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .eq("name", "exercise_opened")
        .gte("occurred_at", new Date(day30).toISOString());

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        const mode = (row.properties as { mode?: string }).mode ?? "unknown";
        counts[mode] = (counts[mode] ?? 0) + 1;
      }
      data = {
        exercises: Object.entries(counts)
          .map(([mode, opens]) => ({ mode, opens }))
          .sort((a, b) => b.opens - a.opens),
      };
    }

    else if (endpoint === "onboarding_funnel") {
      const [launches, onboarded, firstExercise] = await Promise.all([
        supa.from("analytics_events").select("device_id").eq("name", "app_launched"),
        supa.from("analytics_events").select("device_id").eq("name", "onboarding_completed"),
        supa.from("analytics_events").select("device_id").eq("name", "exercise_opened"),
      ]);

      const launchDevices   = new Set((launches.data     ?? []).map((r: { device_id: string }) => r.device_id)).size;
      const onboardedDevices = new Set((onboarded.data   ?? []).map((r: { device_id: string }) => r.device_id)).size;
      const exerciseDevices  = new Set((firstExercise.data ?? []).map((r: { device_id: string }) => r.device_id)).size;

      data = {
        installs:           launchDevices,
        onboardingCompleted: onboardedDevices,
        firstExercise:      exerciseDevices,
        onboardingRate: launchDevices ? Math.round(100 * onboardedDevices / launchDevices) : 0,
        exerciseRate:   launchDevices ? Math.round(100 * exerciseDevices  / launchDevices) : 0,
      };
    }

    else if (endpoint === "recognition_quality") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name")
        .in("name", ["scan_word_found", "scan_word_missed", "laywoord_correct", "laywoord_wrong", "listenpick_correct", "listenpick_wrong"])
        .gte("occurred_at", new Date(weekAgo).toISOString());

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        counts[row.name as string] = (counts[row.name as string] ?? 0) + 1;
      }

      const scanHits    = counts["scan_word_found"]    ?? 0;
      const scanMisses  = counts["scan_word_missed"]   ?? 0;
      const layCorrect  = counts["laywoord_correct"]   ?? 0;
      const layWrong    = counts["laywoord_wrong"]     ?? 0;
      const listenCorrect = counts["listenpick_correct"] ?? 0;
      const listenWrong   = counts["listenpick_wrong"]   ?? 0;

      data = {
        scan:   { hits: scanHits,    misses: scanMisses,  rate: scanHits + scanMisses       ? Math.round(100 * scanHits    / (scanHits    + scanMisses))  : null },
        lay:    { correct: layCorrect, wrong: layWrong,   rate: layCorrect + layWrong       ? Math.round(100 * layCorrect  / (layCorrect  + layWrong))    : null },
        listen: { correct: listenCorrect, wrong: listenWrong, rate: listenCorrect + listenWrong ? Math.round(100 * listenCorrect / (listenCorrect + listenWrong)) : null },
      };
    }

    else if (endpoint === "hardest_phonemes") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name, properties")
        .in("name", ["listenpick_correct", "listenpick_wrong"])
        .gte("occurred_at", new Date(day30).toISOString());

      const phonemeStats: Record<string, { correct: number; wrong: number }> = {};
      for (const row of rows ?? []) {
        const phoneme = (row.properties as { target?: string }).target ?? "?";
        if (!phonemeStats[phoneme]) phonemeStats[phoneme] = { correct: 0, wrong: 0 };
        if (row.name === "listenpick_correct") phonemeStats[phoneme].correct++;
        else phonemeStats[phoneme].wrong++;
      }

      data = {
        phonemes: Object.entries(phonemeStats)
          .map(([phoneme, s]) => ({
            phoneme,
            correct:  s.correct,
            wrong:    s.wrong,
            total:    s.correct + s.wrong,
            wrongPct: s.correct + s.wrong ? Math.round(100 * s.wrong / (s.correct + s.wrong)) : 0,
          }))
          .filter(p => p.total >= 5)
          .sort((a, b) => b.wrongPct - a.wrongPct)
          .slice(0, 10),
      };
    }

    else if (endpoint === "wordsearch_abandonment") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name")
        .in("name", ["wordsearch_round_started", "wordsearch_round_completed"])
        .gte("occurred_at", new Date(day30).toISOString());

      let started = 0, completed = 0;
      for (const row of rows ?? []) {
        if (row.name === "wordsearch_round_started") started++;
        else completed++;
      }

      data = {
        started,
        completed,
        abandonmentPct: started ? Math.round(100 - 100 * completed / started) : 0,
      };
    }

    else if (endpoint === "app_versions") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("app_version, device_id")
        .gte("occurred_at", new Date(day14).toISOString());

      const versionDevices: Record<string, Set<string>> = {};
      for (const row of rows ?? []) {
        const v = (row.app_version as string) ?? "unknown";
        if (!versionDevices[v]) versionDevices[v] = new Set();
        versionDevices[v].add(row.device_id as string);
      }

      data = {
        versions: Object.entries(versionDevices)
          .map(([version, devices]) => ({ version, devices: devices.size }))
          .sort((a, b) => b.devices - a.devices),
      };
    }

    else if (endpoint === "most_found_words") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .eq("name", "scan_word_found")
        .gte("occurred_at", new Date(day30).toISOString());

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        const word = (row.properties as { word?: string }).word ?? "?";
        counts[word] = (counts[word] ?? 0) + 1;
      }
      data = {
        words: Object.entries(counts)
          .map(([word, finds]) => ({ word, finds }))
          .sort((a, b) => b.finds - a.finds)
          .slice(0, 20),
      };
    }

    else if (endpoint === "top_missed_scans") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .eq("name", "scan_word_missed")
        .gte("occurred_at", new Date(day30).toISOString());

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        const seen = (row.properties as { seen?: string }).seen ?? "";
        if (!seen) continue;
        counts[seen] = (counts[seen] ?? 0) + 1;
      }
      data = {
        misses: Object.entries(counts)
          .map(([seen, count]) => ({ seen, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20),
      };
    }

    else if (endpoint === "sessions_per_device") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("device_id, session_id")
        .gte("occurred_at", new Date(weekAgo).toISOString());

      const deviceSessions: Record<string, Set<string>> = {};
      for (const row of rows ?? []) {
        const d = row.device_id as string;
        if (!deviceSessions[d]) deviceSessions[d] = new Set();
        deviceSessions[d].add(row.session_id as string);
      }

      const sessionCounts = Object.values(deviceSessions).map(s => s.size);
      const totalDevices  = sessionCounts.length;
      const totalSessions = sessionCounts.reduce((a, b) => a + b, 0);
      const avgSessions   = totalDevices ? Math.round((totalSessions / totalDevices) * 10) / 10 : 0;

      const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
      for (const c of sessionCounts) {
        const key = c >= 5 ? "5+" : String(c);
        dist[key] = (dist[key] ?? 0) + 1;
      }

      data = { totalDevices, totalSessions, avgSessions, distribution: dist };
    }

    else if (endpoint === "session_length") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("session_id, occurred_at")
        .gte("occurred_at", new Date(weekAgo).toISOString())
        .order("occurred_at", { ascending: true });

      const sessionTimes: Record<string, { min: number; max: number; count: number }> = {};
      for (const row of rows ?? []) {
        const sid = row.session_id as string;
        const t   = new Date(row.occurred_at as string).getTime();
        if (!sessionTimes[sid]) sessionTimes[sid] = { min: t, max: t, count: 0 };
        if (t < sessionTimes[sid].min) sessionTimes[sid].min = t;
        if (t > sessionTimes[sid].max) sessionTimes[sid].max = t;
        sessionTimes[sid].count++;
      }

      const durations = Object.values(sessionTimes)
        .filter(s => s.count > 1)
        .map(s => Math.round((s.max - s.min) / 1000));

      durations.sort((a, b) => a - b);
      const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
      const avg    = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

      data = { medianSeconds: median, avgSeconds: avg, sessionCount: durations.length };
    }

    else if (endpoint === "wordsearch_efficiency") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .in("name", ["wordsearch_round_completed", "wordsearch_word_found"])
        .gte("occurred_at", new Date(day30).toISOString());

      let totalFound = 0, totalPossible = 0, roundCount = 0;
      for (const row of rows ?? []) {
        const p = row.properties as { found?: number; total?: number };
        if (p.found !== undefined && p.total !== undefined) {
          totalFound    += p.found;
          totalPossible += p.total;
          roundCount++;
        }
      }

      data = {
        avgFound:           roundCount      ? Math.round((totalFound    / roundCount) * 10) / 10 : null,
        avgTotal:           roundCount      ? Math.round((totalPossible / roundCount) * 10) / 10 : null,
        avgCompletionPct:   totalPossible   ? Math.round(100 * totalFound / totalPossible)        : null,
        roundCount,
      };
    }

    else if (endpoint === "top_phrases") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .eq("name", "wordreader_phrase")
        .gte("occurred_at", new Date(day30).toISOString());

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        const phrase = (row.properties as { phrase?: string }).phrase ?? "?";
        counts[phrase] = (counts[phrase] ?? 0) + 1;
      }
      data = {
        phrases: Object.entries(counts)
          .map(([phrase, reads]) => ({ phrase, reads }))
          .sort((a, b) => b.reads - a.reads)
          .slice(0, 20),
      };
    }

    else if (endpoint === "hardest_laywords") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name, properties")
        .in("name", ["laywoord_correct", "laywoord_wrong"])
        .gte("occurred_at", new Date(day30).toISOString());

      const wordStats: Record<string, { correct: number; wrong: number }> = {};
      for (const row of rows ?? []) {
        const target = (row.properties as { target?: string }).target ?? "?";
        if (!wordStats[target]) wordStats[target] = { correct: 0, wrong: 0 };
        if (row.name === "laywoord_correct") wordStats[target].correct++;
        else wordStats[target].wrong++;
      }

      data = {
        words: Object.entries(wordStats)
          .map(([word, s]) => ({
            word,
            correct:  s.correct,
            wrong:    s.wrong,
            total:    s.correct + s.wrong,
            wrongPct: s.correct + s.wrong ? Math.round(100 * s.wrong / (s.correct + s.wrong)) : 0,
          }))
          .filter(w => w.total >= 3)
          .sort((a, b) => b.wrongPct - a.wrongPct)
          .slice(0, 10),
      };
    }

    else if (endpoint === "exercise_time") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("properties")
        .eq("name", "exercise_closed")
        .gte("occurred_at", new Date(day30).toISOString());

      const modeStats: Record<string, { totalSeconds: number; count: number }> = {};
      for (const row of rows ?? []) {
        const p    = row.properties as { mode?: string; seconds?: number };
        const mode = p.mode ?? "unknown";
        const secs = p.seconds ?? 0;
        if (!modeStats[mode]) modeStats[mode] = { totalSeconds: 0, count: 0 };
        modeStats[mode].totalSeconds += secs;
        modeStats[mode].count++;
      }

      data = {
        modes: Object.entries(modeStats)
          .map(([mode, s]) => ({
            mode,
            avgSeconds:   Math.round(s.totalSeconds / s.count),
            totalSeconds: s.totalSeconds,
            sessions:     s.count,
          }))
          .sort((a, b) => b.avgSeconds - a.avgSeconds),
      };
    }

    else if (endpoint === "app_activity") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name, occurred_at")
        .in("name", ["app_launched", "app_foregrounded", "app_backgrounded"])
        .gte("occurred_at", new Date(day14).toISOString())
        .order("occurred_at", { ascending: true });

      const byDay: Record<string, { launched: number; foregrounded: number; backgrounded: number }> = {};
      for (const row of rows ?? []) {
        const day = (row.occurred_at as string).slice(0, 10);
        if (!byDay[day]) byDay[day] = { launched: 0, foregrounded: 0, backgrounded: 0 };
        if (row.name === "app_launched")      byDay[day].launched++;
        else if (row.name === "app_foregrounded") byDay[day].foregrounded++;
        else byDay[day].backgrounded++;
      }

      let totalLaunched = 0, totalForegrounded = 0, totalBackgrounded = 0;
      for (const d of Object.values(byDay)) {
        totalLaunched     += d.launched;
        totalForegrounded += d.foregrounded;
        totalBackgrounded += d.backgrounded;
      }

      data = {
        daily: Object.entries(byDay)
          .map(([day, counts]) => ({ day, ...counts }))
          .sort((a, b) => a.day.localeCompare(b.day)),
        totals: { launched: totalLaunched, foregrounded: totalForegrounded, backgrounded: totalBackgrounded },
      };
    }

    else if (endpoint === "writing_stats") {
      const { data: rows } = await supa
        .from("analytics_events")
        .select("name, properties")
        .in("name", ["writing_letter_shown", "writing_completed"])
        .gte("occurred_at", new Date(day30).toISOString());

      const phonemeStats: Record<string, { shown: number; completed: number }> = {};
      let totalShown = 0, totalCompleted = 0;
      for (const row of rows ?? []) {
        const phoneme = (row.properties as { phoneme?: string }).phoneme ?? "?";
        if (!phonemeStats[phoneme]) phonemeStats[phoneme] = { shown: 0, completed: 0 };
        if (row.name === "writing_letter_shown") { phonemeStats[phoneme].shown++; totalShown++; }
        else { phonemeStats[phoneme].completed++; totalCompleted++; }
      }

      data = {
        totalShown,
        totalCompleted,
        completionRate: totalShown ? Math.round(100 * totalCompleted / totalShown) : null,
        phonemes: Object.entries(phonemeStats)
          .map(([phoneme, s]) => ({
            phoneme,
            shown:          s.shown,
            completed:      s.completed,
            completionRate: s.shown ? Math.round(100 * s.completed / s.shown) : 0,
          }))
          .sort((a, b) => b.shown - a.shown)
          .slice(0, 20),
      };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

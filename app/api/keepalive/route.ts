import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Optional Bearer Auth if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${cronSecret}`;
    if (authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Lightweight Keepalive Ping to Supabase
  let activeSessions = 1;
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    try {
      // Lightweight query touching the database
      const { count } = await supabase
        .from("arena_events")
        .select("*", { count: "exact", head: true });
      if (typeof count === "number") {
        activeSessions = Math.max(1, count);
      }
    } catch (err: any) {
      console.warn("Supabase keepalive ping failed (non-fatal):", err.message);
    }
  }

  // 3. Return HTTP 200 Contract Response
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      activeSessions,
    },
    { status: 200 }
  );
}

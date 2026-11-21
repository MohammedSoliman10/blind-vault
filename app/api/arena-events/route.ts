import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase/client";

export const dynamic = "force-dynamic";

interface ArenaEventBody {
  event_type: string;
  status: string;
  actor_pubkey: string;
  vault_pubkey: string;
  tx_signature?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  details?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  let body: ArenaEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    event_type,
    status,
    actor_pubkey,
    vault_pubkey,
    tx_signature,
    error_code,
    error_message,
    details,
  } = body || {};

  // Basic validation of required columns
  if (!event_type || !status || !actor_pubkey || !vault_pubkey) {
    return NextResponse.json(
      { error: "Missing required fields: event_type, status, actor_pubkey, vault_pubkey" },
      { status: 400 }
    );
  }

  // Ensure tx_signature is only stored if it is a real 87-88 char Base58 signature or null
  const isRealTx = typeof tx_signature === "string" && /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(tx_signature);
  const cleanTxSig = isRealTx ? tx_signature : null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    // If Supabase is not configured (e.g. offline testing), return 200 so UI continues smoothly
    return NextResponse.json({ success: true, localOnly: true });
  }

  try {
    const { data, error } = await supabase
      .from("arena_events")
      .insert({
        event_type: String(event_type).slice(0, 50),
        status: String(status).slice(0, 20),
        actor_pubkey: String(actor_pubkey).slice(0, 44),
        vault_pubkey: String(vault_pubkey).slice(0, 44),
        tx_signature: cleanTxSig,
        error_code: error_code ? String(error_code).slice(0, 50) : null,
        error_message: error_message ? String(error_message) : null,
        details: details && typeof details === "object" ? details : {},
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.warn("Supabase admin insert into arena_events warning:", error.message);
      return NextResponse.json({ success: true, warning: error.message });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err: any) {
    console.warn("Server error logging arena event:", err.message);
    return NextResponse.json({ success: true, warning: err.message });
  }
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required environment variables for Supabase client.");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log("[check-financial-milestones] Invocation started", { time: new Date().toISOString() });

    const APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const API_KEY = Deno.env.get("ONESIGNAL_API_KEY");
    if (!APP_ID || !API_KEY) {
      throw new Error("Missing OneSignal secrets (ONESIGNAL_APP_ID or ONESIGNAL_API_KEY)");
    }

    // Fetch all debts with required fields
    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('id,user_id,description,total_amount');

    if (debtsError) throw debtsError;

    if (!debts || debts.length === 0) {
      console.log("[check-financial-milestones] No debts found");
      return new Response(
        JSON.stringify({ ok: true, checkedDebts: 0, newlyPaidOff: 0, notificationsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const debtIds = debts.map((d: any) => d.id);

    // Fetch all payments for those debts
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('debt_id,amount')
      .in('debt_id', debtIds);

    if (paymentsError) throw paymentsError;

    // Sum payments by debt_id
    const paidMap = new Map<string, number>();
    for (const p of payments ?? []) {
      const id = p.debt_id as string;
      const amt = Number(p.amount || 0);
      paidMap.set(id, (paidMap.get(id) || 0) + amt);
    }

    // Determine fully paid debts (sum >= total_amount)
    const fullyPaidDebts = debts.filter((d: any) => {
      const sum = paidMap.get(d.id as string) || 0;
      return Number(sum) >= Number(d.total_amount || 0);
    });

    if (fullyPaidDebts.length === 0) {
      console.log("[check-financial-milestones] No fully paid debts found");
      return new Response(
        JSON.stringify({ ok: true, checkedDebts: debts.length, newlyPaidOff: 0, notificationsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Filter out debts already logged as paid_off
    const fullyPaidIds = fullyPaidDebts.map((d: any) => d.id);
    const { data: existingLogs, error: logsError } = await supabase
      .from('financial_milestones_log')
      .select('entity_id')
      .eq('entity_type', 'debt')
      .eq('milestone', 'paid_off')
      .in('entity_id', fullyPaidIds);

    if (logsError) throw logsError;

    const alreadyLoggedIds = new Set((existingLogs ?? []).map((l: any) => l.entity_id as string));
    const newlyPaidOff = fullyPaidDebts.filter((d: any) => !alreadyLoggedIds.has(d.id as string));

    if (newlyPaidOff.length === 0) {
      console.log("[check-financial-milestones] No new paid_off milestones to notify");
      return new Response(
        JSON.stringify({ ok: true, checkedDebts: debts.length, newlyPaidOff: 0, notificationsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch profiles for push tokens
    const userIds = Array.from(new Set(newlyPaidOff.map((d: any) => d.user_id))).filter(Boolean);
    const profileMap = new Map<string, { push_token: string | null; display_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,push_token,display_name')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;
      for (const p of profiles ?? []) {
        profileMap.set(p.user_id as string, { push_token: p.push_token ?? null, display_name: p.display_name ?? null });
      }
    }

    async function sendOneSignal(playerId: string, title: string, message: string, data: Record<string, unknown>) {
      const resp = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: APP_ID,
          include_player_ids: [playerId],
          headings: { en: title, tr: title },
          contents: { en: message, tr: message },
          data,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("[check-financial-milestones] OneSignal error", resp.status, txt);
        throw new Error(`OneSignal error: ${resp.status}`);
      }
      return await resp.json();
    }

    let notificationsSent = 0;

    // Prepare logs to insert
    const logsToInsert: Array<any> = [];

    for (const debt of newlyPaidOff as Array<any>) {
      const profile = profileMap.get(debt.user_id as string);
      const playerId = profile?.push_token || null;

      const debtName = (debt.description as string) || "Borç";
      const title = "Tebrikler!";
      const message = `${debtName} borcunu tamamen kapattın! 🥳`;

      if (playerId) {
        try {
          await sendOneSignal(playerId, title, message, {
            entity_type: 'debt',
            milestone: 'paid_off',
            debt_id: debt.id,
          });
          notificationsSent += 1;
        } catch (notifyErr) {
          console.error("[check-financial-milestones] Failed to send notification", notifyErr);
        }
      } else {
        console.log("[check-financial-milestones] No push token for user, skipping notification", debt.user_id);
      }

      logsToInsert.push({
        user_id: debt.user_id,
        entity_id: debt.id,
        entity_type: 'debt',
        milestone: 'paid_off',
      });
    }

    if (logsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('financial_milestones_log')
        .insert(logsToInsert);
      if (insertError) {
        console.error("[check-financial-milestones] Failed to insert milestone logs", insertError);
      }
    }

    console.log("[check-financial-milestones] Invocation completed", {
      checkedDebts: debts.length,
      newlyPaidOff: newlyPaidOff.length,
      notificationsSent,
      time: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, checkedDebts: debts.length, newlyPaidOff: newlyPaidOff.length, notificationsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("[check-financial-milestones] Error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
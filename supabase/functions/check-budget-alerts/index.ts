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
    console.log("[check-budget-alerts] Invocation started", { time: new Date().toISOString() });

    const APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const API_KEY = Deno.env.get("ONESIGNAL_API_KEY");
    if (!APP_ID || !API_KEY) {
      throw new Error("Missing OneSignal secrets (ONESIGNAL_APP_ID or ONESIGNAL_API_KEY)");
    }

    // Compute current UTC month range
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    const monthStartISO = monthStart.toISOString();
    const nextMonthStartISO = nextMonthStart.toISOString();

    // Get all budgets for the current month
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('id,user_id,category,amount,period_start')
      .gte('period_start', monthStartISO)
      .lt('period_start', nextMonthStartISO);

    if (budgetsError) throw budgetsError;

    if (!budgets || budgets.length === 0) {
      console.log("[check-budget-alerts] No budgets found for current month");
      return new Response(
        JSON.stringify({ ok: true, checkedBudgets: 0, notificationsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build a map of user -> profile (push token, display name)
    const userIds = Array.from(new Set(budgets.map((b: any) => b.user_id))).filter(Boolean);

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

    let notificationsSent = 0;
    let checkedBudgets = 0;

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
        console.error("[check-budget-alerts] OneSignal error", resp.status, txt);
        throw new Error(`OneSignal error: ${resp.status}`);
      }
      return await resp.json();
    }

    // Iterate over each budget and evaluate spending
    for (const budget of budgets as Array<any>) {
      checkedBudgets += 1;
      const budgetAmount = Number(budget.amount);

      const { data: expensesRows, error: expensesError } = await supabase
        .from('expenses')
        .select('amount,date,category')
        .eq('user_id', budget.user_id)
        .eq('category', budget.category)
        .gte('date', budget.period_start)
        .lt('date', nextMonthStartISO);

      if (expensesError) throw expensesError;

      const spent = (expensesRows ?? []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      const threshold = budgetAmount * 0.9;
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

      if (spent >= threshold && budgetAmount > 0) {
        const profile = profileMap.get(budget.user_id as string);
        const playerId = profile?.push_token || null;
        if (playerId) {
          const title = "Bütçe Uyarısı";
          const message = `${budget.category} kategorisinde bütçenin %${percentage}'sine ulaştınız (${spent.toFixed(2)} / ${budgetAmount.toFixed(2)}).`;
          try {
            await sendOneSignal(playerId, title, message, {
              category: budget.category,
              spent,
              budget: budgetAmount,
              percentage,
              period_start: budget.period_start,
            });
            notificationsSent += 1;
          } catch (notifyErr) {
            console.error("[check-budget-alerts] Failed to send notification", notifyErr);
          }
        } else {
          console.log("[check-budget-alerts] No push token for user, skipping notification", budget.user_id);
        }
      }
    }

    console.log("[check-budget-alerts] Invocation completed", { checkedBudgets, notificationsSent, time: new Date().toISOString() });

    return new Response(
      JSON.stringify({ ok: true, checkedBudgets, notificationsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("[check-budget-alerts] Error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

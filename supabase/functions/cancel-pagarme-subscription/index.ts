import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscriptionId } = await req.json();

    const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAGARME_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing configuration");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // --- JWT VERIFICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace(/^Bearer /i, '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }
    // ------------------------

    const auth = btoa(`${PAGARME_SECRET_KEY}:`);

    // 1. Get the provider_subscription_id from the database
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('provider_subscription_id, client_id')
      .eq('id', subscriptionId)
      .single();

    if (subError || !sub?.provider_subscription_id) {
      throw new Error("Subscription not found or missing provider ID");
    }

    // Verify ownership of the client associated with the subscription
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', sub.client_id)
      .single();

    if (clientError || !client || client.user_id !== user.id) {
      console.error(`Ownership check failed for user ${user.id} and client ${sub.client_id}`);
      throw new Error("Unauthorized: You do not own this subscription");
    }

    const providerId = sub.provider_subscription_id;

    // 2. Call Pagar.me to cancel
    if (providerId.startsWith('sub_test_') || providerId.startsWith('or_')) {
      console.log(`Mock or one-time payment cancelation detected for provider ID: ${providerId}`);
    } else {
      const response = await fetch(`https://api.pagar.me/core/v5/subscriptions/${providerId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel subscription in Pagar.me");
      }
    }

    // 3. Update Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "Subscription canceled successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error canceling subscription:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

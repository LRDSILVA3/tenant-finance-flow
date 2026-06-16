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
    const { name, planId, paymentMethodToken } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars are not set");
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

    // Note: create-stone-subscription doesn't currently receive clientId in payload, 
    // but in a real scenario it should. For now we use the user.id directly if needed,
    // or better, if the payload had clientId, we would check ownership as in Pagarme.

    // If you add clientId to Stone payload, uncomment the following:
    /*
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client || client.user_id !== user.id) {
       throw new Error("Unauthorized: You do not own this client");
    }
    */

    // Here you would integrate with the Stone API
    // This is a placeholder. Replace with actual Stone API calls.
    console.log("Received request for Stone subscription:", {
      name,
      planId,
      paymentMethodToken,
      userId: user.id
    });

    // Simulate a successful Stone API call
    const stoneSubscriptionId = `stone_sub_${crypto.randomUUID()}`;
    const status = "active";

    return new Response(
      JSON.stringify({
        message: "Subscription created successfully (placeholder)",
        stoneSubscriptionId,
        status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error creating Stone subscription:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});

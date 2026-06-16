import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    const WEBHOOK_SECRET = Deno.env.get("PAGARME_WEBHOOK_SECRET");
    const signature = req.headers.get("x-pagarme-signature");

    // Basic security: if WEBHOOK_SECRET is set, we expect a match or signature
    // For now, let's at least check a token in the URL if provided or a header
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      console.error("Unauthorized webhook attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await req.json();
    console.log("Received webhook event:", payload.type);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const eventType = payload.type;
    const data = payload.data;

    if (eventType === "invoice.paid") {
      const providerSubscriptionId = data.subscription_id;
      const periodEnd = data.subscription.current_period_end;

      if (providerSubscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(periodEnd).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId);
      }
    }

    if (eventType === "invoice.payment_failed") {
      const providerSubscriptionId = data.subscription_id;
      if (providerSubscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId);
      }
    }

    if (eventType === "subscription.canceled") {
      const providerSubscriptionId = data.id;
      if (providerSubscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled', 
            updated_at: new Date().toISOString() 
          })
          .eq('provider_subscription_id', providerSubscriptionId);
      }
    }

    if (eventType === "subscription.updated") {
      const providerSubscriptionId = data.id;
      if (providerSubscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            status: data.status === 'active' ? 'active' : (data.status === 'canceled' ? 'canceled' : 'past_due'),
            current_period_start: new Date(data.current_period_start).toISOString(),
            current_period_end: new Date(data.current_period_end).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});

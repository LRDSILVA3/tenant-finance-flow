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
        const { data: subData } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(periodEnd).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId)
          .select('client_id')
          .single();

        // Email Notification Logic
        if (subData) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id, name')
            .eq('id', subData.client_id)
            .single();

          if (clientData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', clientData.user_id)
              .single();

            if (profile && profile.email) {
              console.log(`[EMAIL MOCK] Sending SUCCESS email to ${profile.email} for client ${clientData.name}`);
              // TODO: Integrate Resend or SendGrid here
              // await resend.emails.send({
              //   from: 'suporte@previna.com.br',
              //   to: profile.email,
              //   subject: 'Pagamento Confirmado - Previna',
              //   html: '<p>Seu pagamento foi confirmado com sucesso. Sua assinatura está ativa!</p>'
              // });
            }
          }
        }
      }
    }

    if (eventType === "order.paid") {
      const providerOrderId = data.id;
      if (providerOrderId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerOrderId)
          .select('client_id')
          .single();

        // Email Notification Logic
        if (subData) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id, name')
            .eq('id', subData.client_id)
            .single();

          if (clientData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', clientData.user_id)
              .single();

            if (profile && profile.email) {
              console.log(`[EMAIL MOCK] Sending SUCCESS email to ${profile.email} for client ${clientData.name}`);
            }
          }
        }
      }
    }

    if (eventType === "invoice.payment_failed") {
      const providerSubscriptionId = data.subscription_id;
      if (providerSubscriptionId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId)
          .select('client_id')
          .single();

        // Email Notification Logic
        if (subData) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id, name')
            .eq('id', subData.client_id)
            .single();

          if (clientData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', clientData.user_id)
              .single();

            if (profile && profile.email) {
              console.log(`[EMAIL MOCK] Sending FAILED email to ${profile.email} for client ${clientData.name}`);
              // TODO: Integrate Resend or SendGrid here
              // await resend.emails.send({
              //   from: 'suporte@previna.com.br',
              //   to: profile.email,
              //   subject: 'Falha no Pagamento - Previna',
              //   html: '<p>Houve um problema ao processar seu pagamento. Acesse o painel para atualizar seu cartão.</p>'
              // });
            }
          }
        }
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

import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    const WEBHOOK_SECRET = Deno.env.get("PAGARME_WEBHOOK_SECRET");
    const signature = req.headers.get("x-pagarme-signature");

    // Basic security: if WEBHOOK_SECRET is set, we expect a match or signature
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
      const amountPaid = data.amount; // in cents

      if (providerSubscriptionId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(periodEnd).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerSubscriptionId)
          .select('id, client_id')
          .single();

        if (subData) {
          // Automatic invoice emission via Asaas Admin (Scenario A)
          await emitAdminAsaasInvoice(supabase, subData.client_id, subData.id, amountPaid);

          // Email Notification Logic
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

    if (eventType === "order.paid") {
      const providerOrderId = data.id;
      const amountPaid = data.amount; // in cents

      if (providerOrderId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', providerOrderId)
          .select('id, client_id')
          .single();

        if (subData) {
          // Automatic invoice emission via Asaas Admin (Scenario A)
          await emitAdminAsaasInvoice(supabase, subData.client_id, subData.id, amountPaid);

          // Email Notification Logic
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
    if (eventType === "invoice.created") {
      const providerSubscriptionId = data.subscription_id || data.subscription?.id;
      const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY");

      if (providerSubscriptionId && PAGARME_SECRET_KEY) {
        console.log(`Processing invoice.created for subscription: ${providerSubscriptionId}`);
        // 1. Get client subscription and plan
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('client_id, plan_id')
          .eq('provider_subscription_id', providerSubscriptionId)
          .maybeSingle();

        if (subData) {
          // 2. Get plan features
          const { data: planData } = await supabase
            .from('plans')
            .select('features')
            .eq('id', subData.plan_id)
            .maybeSingle();

          if (planData) {
            const features = typeof planData.features === 'string' ? JSON.parse(planData.features) : planData.features;
            const freeInvoices = features?.free_invoices || 0;
            const invoiceFee = features?.invoice_fee || 0;

            // 3. Get unbilled authorized invoices
            const { data: unbilledInvoices } = await supabase
              .from('invoices')
              .select('id')
              .eq('client_id', subData.client_id)
              .eq('status', 'AUTHORIZED')
              .eq('client_api_key_used', true)
              .eq('billed', false);

            const count = unbilledInvoices?.length || 0;
            const billableCount = Math.max(0, count - freeInvoices);
            const billableAmount = billableCount * invoiceFee;

            console.log(`Client ${subData.client_id} has ${count} unbilled authorized invoices. Free limit: ${freeInvoices}. Billable: ${billableCount}. Amount: R$ ${billableAmount}`);

            if (billableAmount > 0) {
              // 4. Add item to Pagar.me invoice
              const pagarmeUrl = `https://api.pagar.me/core/v5/invoices/${data.id}/items`;
              const auth = btoa(`${PAGARME_SECRET_KEY}:`);
              
              const itemBody = {
                description: `Excedente de Notas Fiscais (${billableCount} notas adicionais)`,
                amount: Math.round(billableAmount * 100), // in cents
                quantity: 1
              };

              console.log(`Adding item to Pagar.me invoice ${data.id} via API:`, itemBody);

              const response = await fetch(pagarmeUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemBody)
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to add usage item to Pagar.me invoice ${data.id}:`, errorText);
              } else {
                console.log(`Successfully added usage item to Pagar.me invoice ${data.id}`);
              }
            }

            // 5. Always mark current list of invoices as billed so they are not double-billed
            if (unbilledInvoices && unbilledInvoices.length > 0) {
              const invoiceIds = unbilledInvoices.map(inv => inv.id);
              const { error: updateError } = await supabase
                .from('invoices')
                .update({ billed: true })
                .in('id', invoiceIds);
              
              if (updateError) {
                console.error("Error marking invoices as billed:", updateError.message);
              } else {
                console.log(`Marked ${invoiceIds.length} invoices as billed.`);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});

// Helper for Scenario A (Platform administrative Asaas invoice emission)
async function emitAdminAsaasInvoice(supabase: any, clientId: string, subscriptionId: string, amount: number) {
  try {
    const ADMIN_ASAAS_API_KEY = Deno.env.get("ADMIN_ASAAS_API_KEY");
    const ADMIN_ASAAS_API_URL = Deno.env.get("ADMIN_ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";
    const ADMIN_ASAAS_MUNICIPAL_SERVICE_CODE = Deno.env.get("ADMIN_ASAAS_MUNICIPAL_SERVICE_CODE");

    if (!ADMIN_ASAAS_API_KEY) {
      console.warn("ADMIN_ASAAS_API_KEY is not set. Skipping automatic platform invoice emission.");
      return;
    }

    // 1. Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, tax_id, user_id, admin_asaas_customer_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client for invoice:", clientError);
      return;
    }

    // 2. Get client address
    const { data: address } = await supabase
      .from('addresses')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_main', true)
      .maybeSingle();

    // 3. Get profile email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, whatsapp_number')
      .eq('id', client.user_id)
      .single();

    const email = profile?.email || "financeiro@previna.com.br";
    const headers = {
      "access_token": ADMIN_ASAAS_API_KEY,
      "Content-Type": "application/json"
    };

    let asaasCustomerId = client.admin_asaas_customer_id;

    // 4. Create customer in admin account if not exists
    if (!asaasCustomerId) {
      console.log(`[ADMIN ASAAS] Creating customer for client ${client.name}...`);
      const phoneDigits = profile?.whatsapp_number ? profile.whatsapp_number.replace(/\D/g, '') : '';
      
      const customerBody = {
        name: client.name,
        email: email,
        phone: phoneDigits || undefined,
        cpfCnpj: client.tax_id ? client.tax_id.replace(/\D/g, '') : undefined,
        postalCode: address?.zip_code ? address.zip_code.replace(/\D/g, '') : undefined,
        address: address?.street || undefined,
        addressNumber: address?.number || undefined,
        complement: address?.complement || undefined,
        province: address?.neighborhood || undefined,
        externalReference: clientId
      };

      const custRes = await fetch(`${ADMIN_ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(customerBody)
      });

      const custData = await custRes.json();
      if (!custRes.ok) {
        console.error(`[ADMIN ASAAS] Failed to create customer on Asaas:`, custData.errors?.[0]?.description);
        return;
      }

      asaasCustomerId = custData.id;
      
      // Save back to DB
      await supabase
        .from('clients')
        .update({ admin_asaas_customer_id: asaasCustomerId })
        .eq('id', clientId);
    }

    // 5. Emit Invoice
    const today = new Date().toISOString().split('T')[0];
    const invoiceBody = {
      customer: asaasCustomerId,
      serviceDescription: `Assinatura Mensal - Plataforma Previna SaaS (Cliente: ${client.name})`,
      value: amount / 100, // cents to reais
      effectiveDate: today,
      municipalServiceId: ADMIN_ASAAS_MUNICIPAL_SERVICE_CODE || undefined,
      externalReference: subscriptionId
    };

    console.log(`[ADMIN ASAAS] Creating invoice for subscription ${subscriptionId}...`);
    const invRes = await fetch(`${ADMIN_ASAAS_API_URL}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoiceBody)
    });

    const invData = await invRes.json();
    if (!invRes.ok) {
      console.error(`[ADMIN ASAAS] Failed to create invoice on Asaas:`, invData.errors?.[0]?.description);
      return;
    }

    // 6. Save locally
    const { error: insertError } = await supabase
      .from('invoices')
      .insert({
        client_id: clientId,
        subscription_id: subscriptionId,
        asaas_id: invData.id,
        status: invData.status,
        amount: amount / 100,
        description: invoiceBody.serviceDescription,
        pdf_url: invData.pdfUrl || null,
        xml_url: invData.xmlUrl || null,
        client_api_key_used: false
      });

    if (insertError) {
      console.error("[ADMIN ASAAS] Failed to save invoice locally:", insertError);
    } else {
      console.log(`[ADMIN ASAAS] Invoice ${invData.id} created and logged successfully.`);
    }

  } catch (err) {
    console.error("[ADMIN ASAAS] Unexpected error in invoice helper:", err.message);
  }
}

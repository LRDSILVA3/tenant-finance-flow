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
    const { 
      clientId, 
      planId, 
      planName, 
      amount, 
      cardToken, 
      customer 
    } = await req.json();

    const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAGARME_SECRET_KEY) throw new Error("PAGARME_SECRET_KEY is not set");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Supabase env vars are not set");

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

    // Ensure the user owns the client they are subscribing for
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      throw new Error("Unauthorized: Client not found");
    }

    if (client.user_id !== user.id) {
      console.error(`User mismatch: ${user.id} does not own client ${clientId} (owner: ${client.user_id})`);
      throw new Error("Unauthorized: You do not own this client");
    }
    // ------------------------
    const auth = btoa(`${PAGARME_SECRET_KEY}:`);

    // Fetch plan details from Supabase to get trial_months
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('trial_months, price')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    const trialMonths = plan.trial_months || 0;
    const trialDays = trialMonths > 0 ? 7 : 0; // Trial de 7 dias fixos para os planos que oferecem degustação

    let pagarmeData;

    // --- MOCK/TEST MODE ---
    if (cardToken.startsWith('card_token_mock_')) {
      console.log(`Mock token detected, simulating success with ${trialDays} trial days...`);
      pagarmeData = {
        id: `sub_test_${Math.random().toString(36).substr(2, 9)}`,
        status: trialDays > 0 ? 'trialing' : 'active',
      };
    } else {
      // 1. Create Subscription in Pagar.me
      const phoneDigits = customer.phone.replace(/\D/g, '');
      const areaCode = phoneDigits.substring(0, 2);
      const phoneNumber = phoneDigits.substring(2);

      const customerAddress = customer.address || {
        zipCode: "01001000",
        street: "Endereço não informado",
        number: "S/N",
        city: "Sao Paulo",
        state: "SP"
      };

      const pagarmeAddress = {
        line_1: `${customerAddress.number},${customerAddress.street}${customerAddress.neighborhood ? ','+customerAddress.neighborhood : ''}`,
        line_2: customerAddress.complement || '',
        zip_code: customerAddress.zipCode.replace(/\D/g, ''),
        city: customerAddress.city,
        state: customerAddress.state,
        country: "BR",
      };

      const body: Record<string, unknown> = {
        payment_method: "credit_card",
        card: {
          token: cardToken,
          billing_address: pagarmeAddress,
        },
        customer: {
          name: customer.name,
          email: customer.email,
          document: customer.document,
          type: "individual",
          phones: {
            mobile_phone: {
              country_code: "55",
              area_code: areaCode || "11",
              number: phoneNumber || "999999999",
            }
          },
          address: pagarmeAddress
        },
        billing: {
          name: customer.name,
          address: {
            country: "BR",
            state: customerAddress.state,
            city: customerAddress.city,
            zip_code: customerAddress.zipCode.replace(/\D/g, ''),
            line_1: `${customerAddress.number},${customerAddress.street}${customerAddress.neighborhood ? ','+customerAddress.neighborhood : ''}`,
            line_2: customerAddress.complement || ''
          }
        },
        items: [
          {
            description: `Plano ${planName}`,
            quantity: 1,
            cycles: 1,
            code: planId, // Added mandatory code for the item
            pricing_scheme: {
              scheme_type: "unit",
              unit_price: amount,
              price: amount,
            },
          }
        ],
        interval: "month",
        interval_count: 1,
        billing_type: "prepaid",
        metadata: {
          clientId,
          planId
        }
      };

      if (trialDays > 0) {
        // Use start_at to push the first billing date to the future (trial period)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + trialDays);
        body.start_at = startDate.toISOString();
      }

      const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify(body),
      });

      pagarmeData = await pagarmeResponse.json();

      if (!pagarmeResponse.ok) {
        console.error("Pagar.me Error Details:", JSON.stringify(pagarmeData, null, 2));
        
        // If Pagar.me returns specific validation errors, join them
        const errorDetails = pagarmeData.errors 
          ? Object.entries(pagarmeData.errors).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join('; ')
          : '';
          
        throw new Error(errorDetails || pagarmeData.message || "Pagar.me API error");
      }
    }

    // 2. Update Supabase Database using Service Role
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    const now = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(now.getDate() + trialDays);

    const periodEndDate = new Date();
    periodEndDate.setMonth(now.getMonth() + (trialMonths || 1));

    const subData = {
      client_id: clientId,
      plan_id: planId,
      status: pagarmeData.status, // active or trialing
      provider_subscription_id: pagarmeData.id,
      trial_start: now.toISOString(),
      trial_end: trialEndDate.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: periodEndDate.toISOString(),
      updated_at: now.toISOString(),
    };

    let dbError;
    if (existingSub) {
      const { error } = await supabase
        .from('subscriptions')
        .update(subData)
        .eq('id', (existingSub as { id: string }).id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert(subData);
      dbError = error;
    }

    if (dbError) {
      console.error("Database Error:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pagarmeSubscriptionId: pagarmeData.id,
        status: pagarmeData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );

  } catch (error) {
    console.error("Error processing subscription:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});

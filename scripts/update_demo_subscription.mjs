import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read env variables
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const email = "demo@previna.com.br";
  const password = "previna123";

  console.log(`🔑 Logging in as: ${email}...`);
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("❌ Sign in failed:", signInError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  const clientToken = authData.session.access_token;
  console.log(`✅ Logged in successfully. User ID: ${userId}`);

  // Create an authenticated client scoped to this user only
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${clientToken}`
      }
    }
  });

  // Fetch Avançado plan
  const { data: plans, error: plansError } = await userClient.from('plans').select('*');
  if (plansError) {
    console.error("❌ Failed to fetch plans:", plansError.message);
    process.exit(1);
  }

  const advancedPlan = plans.find(p => p.name === 'Avançado') || plans[0];
  console.log(`✅ Target Plan: ${advancedPlan.name} (${advancedPlan.id})`);

  // Fetch only clients owned by THIS user
  const { data: myClients, error: clientsError } = await userClient
    .from('clients')
    .select('id, name, user_id')
    .eq('user_id', userId);

  if (clientsError) {
    console.error("❌ Failed to fetch clients:", clientsError.message);
    process.exit(1);
  }

  console.log(`🏢 Found ${myClients.length} clients for user ${email}:`);
  myClients.forEach(c => console.log(` - ${c.name} (${c.id})`));

  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);

  for (const client of myClients) {
    console.log(`🔄 Updating subscription for client: ${client.name} (${client.id})...`);
    
    // Check if subscription exists
    const { data: existingSub } = await userClient
      .from('subscriptions')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();

    if (existingSub) {
      const { error: updateError } = await userClient
        .from('subscriptions')
        .update({
          plan_id: advancedPlan.id,
          status: 'active',
          trial_start: now.toISOString(),
          trial_end: nextYear.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: nextYear.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error(`❌ Error updating subscription for ${client.name}:`, updateError.message);
      } else {
        console.log(`✅ Successfully updated subscription to Active (Avançado) for ${client.name}`);
      }
    } else {
      const { error: insertError } = await userClient
        .from('subscriptions')
        .insert({
          client_id: client.id,
          plan_id: advancedPlan.id,
          status: 'active',
          trial_start: now.toISOString(),
          trial_end: nextYear.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: nextYear.toISOString(),
        });

      if (insertError) {
        console.error(`❌ Error inserting subscription for ${client.name}:`, insertError.message);
      } else {
        console.log(`✅ Successfully inserted Active (Avançado) subscription for ${client.name}`);
      }
    }
  }

  console.log("🎉 Subscription update completed safely without touching other clients!");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

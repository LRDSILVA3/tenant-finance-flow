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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

async function main() {
  const email = "demo@previna.com.br";
  const password = "previna123";

  console.log(`🚀 Starting seeding process for user: ${email}...`);

  // 1. Sign up user or Sign in if exists
  let userId;
  let authData;
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
      console.log("ℹ️ User already registered. Logging in...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error("❌ Sign in failed:", signInError.message);
        process.exit(1);
      }
      userId = signInData.user.id;
      authData = signInData;
    } else {
      console.error("❌ Sign up failed:", signUpError.message);
      process.exit(1);
    }
  } else {
    userId = signUpData.user?.id;
    authData = signUpData;
    console.log(`✅ User registered successfully with ID: ${userId}`);
    if (!signUpData.session) {
      console.log("⚠️ Email confirmation required or session not returned. Trying to sign in to confirm session...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.warn("⚠️ Could not sign in. Email verification might be enabled. Please verify your email.");
      } else {
        userId = signInData.user.id;
        authData = signInData;
        console.log("✅ Logged in successfully after sign up.");
      }
    }
  }

  // Create an authenticated client instance with the user's token
  const clientToken = authData?.session?.access_token;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${clientToken}`
      }
    }
  });

  // 2. Fetch plans
  console.log("🔍 Fetching plans...");
  const { data: plans, error: plansError } = await userClient.from('plans').select('*');
  if (plansError) {
    console.error("❌ Failed to fetch plans:", plansError.message);
    process.exit(1);
  }
  
  const advancedPlan = plans.find(p => p.name === 'Avançado');
  
  if (!advancedPlan) {
    console.error("❌ Advanced plan not found in database.");
    process.exit(1);
  }
  console.log(`✅ Found plan: ${advancedPlan.name} (${advancedPlan.id})`);

  // 3. Clear existing clients under this user to start fresh
  console.log("🧹 Cleaning up old client records...");
  const { data: existingClients } = await userClient.from('clients').select('id');
  if (existingClients && existingClients.length > 0) {
    for (const c of existingClients) {
      await userClient.from('clients').delete().eq('id', c.id);
    }
    console.log(`✅ Deleted ${existingClients.length} existing clients.`);
  }

  // 4. Seeding user_settings
  console.log("⚙️ Setting up user settings...");
  await userClient.from('user_settings').upsert({
    user_id: userId,
    enable_payment_methods: true,
    enable_commission: true
  });

  // 5. Seed Client 1: Mercado Ponto Certo
  console.log("🏢 Seeding Client 1: Mercado Ponto Certo...");
  const { data: client1, error: c1Error } = await userClient.from('clients').insert({
    user_id: userId,
    name: "Mercado Ponto Certo",
    tax_id: "12.345.678/0001-90"
  }).select().single();

  if (c1Error) {
    console.error("❌ Client 1 creation failed:", c1Error.message);
    process.exit(1);
  }
  console.log(`✅ Client 1 created: ID ${client1.id}`);

  // 6. Seed Client 2: Clínica OdontoPrev
  console.log("🏢 Seeding Client 2: Clínica OdontoPrev...");
  const { data: client2, error: c2Error } = await userClient.from('clients').insert({
    user_id: userId,
    name: "Clínica OdontoPrev",
    tax_id: "98.765.432/0001-10"
  }).select().single();

  if (c2Error) {
    console.error("❌ Client 2 creation failed:", c2Error.message);
    process.exit(1);
  }
  console.log(`✅ Client 2 created: ID ${client2.id}`);

  // Define clients configs
  const clientConfigs = [
    {
      client: client1,
      address: {
        type: 'billing',
        zip_code: '01001-000',
        street: 'Praça da Sé',
        number: '100',
        complement: 'Bloco A',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        is_main: true
      },
      collaborators: ["Lucas Souza", "Mariana Silva"],
      parentCategories: [
        { name: "Receitas", type: "income", code: "1", sort_order: 1 },
        { name: "Despesas", type: "expense", code: "2", sort_order: 2 }
      ],
      subcategories: [
        { name: "Vendas", type: "income", code: "1.1", sort_order: 1, parentName: "Receitas" },
        { name: "Prestações de Serviços", type: "income", code: "1.2", sort_order: 2, parentName: "Receitas" },
        { name: "Rendimentos", type: "income", code: "1.3", sort_order: 3, parentName: "Receitas" },
        { name: "Aluguel", type: "expense", code: "2.1", sort_order: 1, parentName: "Despesas" },
        { name: "Salários", type: "expense", code: "2.2", sort_order: 2, parentName: "Despesas" },
        { name: "Marketing", type: "expense", code: "2.3", sort_order: 3, parentName: "Despesas" },
        { name: "Impostos", type: "expense", code: "2.4", sort_order: 4, parentName: "Despesas" },
        { name: "Fornecedores", type: "expense", code: "2.5", sort_order: 5, parentName: "Despesas" }
      ],
      transactions: (collabIds, catIds) => [
        { description: "Venda Mensal Frente Loja", type: "income", amount: 15450.00, date: "2026-03-10", payment_method: "pix", category_id: catIds["Vendas"] },
        { description: "Serviço de Entrega Especial", type: "income", amount: 2300.00, date: "2026-03-25", payment_method: "card", category_id: catIds["Prestações de Serviços"], collaborator_id: collabIds["Lucas Souza"], commission_amount: 115.00 },
        { description: "Pagamento Aluguel Março", type: "expense", amount: 4500.00, date: "2026-03-05", payment_method: "pix", category_id: catIds["Aluguel"] },
        { description: "Folha de Pagamento Março", type: "expense", amount: 6200.00, date: "2026-03-28", payment_method: "pix", category_id: catIds["Salários"] },
        
        { description: "Venda Mensal Frente Loja", type: "income", amount: 18200.00, date: "2026-04-12", payment_method: "pix", category_id: catIds["Vendas"] },
        { description: "Serviço de Entrega Especial", type: "income", amount: 3100.00, date: "2026-04-20", payment_method: "card", category_id: catIds["Prestações de Serviços"], collaborator_id: collabIds["Mariana Silva"], commission_amount: 155.00 },
        { description: "Ajuste Contábil Rendimentos", type: "income", amount: 450.00, date: "2026-04-30", payment_method: "pix", category_id: catIds["Rendimentos"] },
        { description: "Pagamento Aluguel Abril", type: "expense", amount: 4500.00, date: "2026-04-05", payment_method: "pix", category_id: catIds["Aluguel"] },
        { description: "Campanha Google Ads", type: "expense", amount: 1200.00, date: "2026-04-15", payment_method: "card", category_id: catIds["Marketing"] },
        { description: "Folha de Pagamento Abril", type: "expense", amount: 6200.00, date: "2026-04-28", payment_method: "pix", category_id: catIds["Salários"] },
        
        { description: "Venda Mensal Frente Loja", type: "income", amount: 21000.00, date: "2026-05-10", payment_method: "pix", category_id: catIds["Vendas"] },
        { description: "Serviço de Entrega Especial", type: "income", amount: 4500.00, date: "2026-05-22", payment_method: "card", category_id: catIds["Prestações de Serviços"], collaborator_id: collabIds["Lucas Souza"], commission_amount: 225.00 },
        { description: "Pagamento Aluguel Maio", type: "expense", amount: 4500.00, date: "2026-05-05", payment_method: "pix", category_id: catIds["Aluguel"] },
        { description: "Reposicionamento Fornecedores", type: "expense", amount: 3500.00, date: "2026-05-18", payment_method: "card", category_id: catIds["Fornecedores"] },
        { description: "Folha de Pagamento Maio", type: "expense", amount: 6500.00, date: "2026-05-28", payment_method: "pix", category_id: catIds["Salários"] },
        
        { description: "Venda Mensal Frente Loja Parcial", type: "income", amount: 12300.00, date: "2026-06-08", payment_method: "pix", category_id: catIds["Vendas"] },
        { description: "Pagamento Aluguel Junho", type: "expense", amount: 4500.00, date: "2026-06-05", payment_method: "pix", category_id: catIds["Aluguel"] },
        { description: "Impostos do Simples Nacional", type: "expense", amount: 1850.00, date: "2026-06-15", payment_method: "pix", category_id: catIds["Impostos"] }
      ]
    },
    {
      client: client2,
      address: {
        type: 'billing',
        zip_code: '80010-000',
        street: 'Avenida Sete de Setembro',
        number: '1500',
        complement: 'Sala 402',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        country: 'Brasil',
        is_main: true
      },
      collaborators: ["Dr. André Melo", "Dra. Beatriz Santos"],
      parentCategories: [
        { name: "Receitas", type: "income", code: "1", sort_order: 1 },
        { name: "Despesas", type: "expense", code: "2", sort_order: 2 }
      ],
      subcategories: [
        { name: "Consultas", type: "income", code: "1.1", sort_order: 1, parentName: "Receitas" },
        { name: "Procedimentos Cirúrgicos", type: "income", code: "1.2", sort_order: 2, parentName: "Receitas" },
        { name: "Aluguel Consultório", type: "expense", code: "2.1", sort_order: 1, parentName: "Despesas" },
        { name: "Materiais Odontológicos", type: "expense", code: "2.2", sort_order: 2, parentName: "Despesas" },
        { name: "Secretária e Recepção", type: "expense", code: "2.3", sort_order: 3, parentName: "Despesas" },
        { name: "Marketing e Mídias", type: "expense", code: "2.4", sort_order: 4, parentName: "Despesas" }
      ],
      transactions: (collabIds, catIds) => [
        { description: "Consulta Geral - Paciente A", type: "income", amount: 350.00, date: "2026-04-03", payment_method: "pix", category_id: catIds["Consultas"], collaborator_id: collabIds["Dr. André Melo"], commission_amount: 70.00 },
        { description: "Procedimento Implante Dentário", type: "income", amount: 4200.00, date: "2026-04-10", payment_method: "card", category_id: catIds["Procedimentos Cirúrgicos"], collaborator_id: collabIds["Dra. Beatriz Santos"], commission_amount: 840.00 },
        { description: "Aluguel da Sala Comercial", type: "expense", amount: 3200.00, date: "2026-04-05", payment_method: "pix", category_id: catIds["Aluguel Consultório"] },
        { description: "Salários Staff", type: "expense", amount: 2800.00, date: "2026-04-28", payment_method: "pix", category_id: catIds["Secretária e Recepção"] },
        
        { description: "Consulta Canal - Paciente B", type: "income", amount: 850.00, date: "2026-05-02", payment_method: "card", category_id: catIds["Consultas"], collaborator_id: collabIds["Dr. André Melo"], commission_amount: 170.00 },
        { description: "Procedimento Clareamento", type: "income", amount: 1500.00, date: "2026-05-15", payment_method: "pix", category_id: catIds["Consultas"], collaborator_id: collabIds["Dra. Beatriz Santos"], commission_amount: 300.00 },
        { description: "Aluguel da Sala Comercial", type: "expense", amount: 3200.00, date: "2026-05-05", payment_method: "pix", category_id: catIds["Aluguel Consultório"] },
        { description: "Estoque Insumos e Resinas", type: "expense", amount: 1450.00, date: "2026-05-12", payment_method: "card", category_id: catIds["Materiais Odontológicos"] },
        { description: "Anúncios Instagram Local", type: "expense", amount: 800.00, date: "2026-05-20", payment_method: "card", category_id: catIds["Marketing e Mídias"] },
        { description: "Salários Staff", type: "expense", amount: 2800.00, date: "2026-05-28", payment_method: "pix", category_id: catIds["Secretária e Recepção"] },
        
        { description: "Procedimento Ortodontia", type: "income", amount: 2900.00, date: "2026-06-11", payment_method: "pix", category_id: catIds["Procedimentos Cirúrgicos"], collaborator_id: collabIds["Dr. André Melo"], commission_amount: 580.00 },
        { description: "Aluguel da Sala Comercial", type: "expense", amount: 3200.00, date: "2026-06-05", payment_method: "pix", category_id: catIds["Aluguel Consultório"] }
      ]
    }
  ];

  for (const config of clientConfigs) {
    const cid = config.client.id;
    console.log(`\n📦 Seeding data for: ${config.client.name}...`);

    // A. Create subscription
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialStart.getDate() + 7);
    const periodEnd = new Date();
    periodEnd.setMonth(trialStart.getMonth() + 1);

    await userClient.from('subscriptions').insert({
      client_id: cid,
      plan_id: advancedPlan.id,
      status: 'trialing',
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: trialStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    // B. Address
    await userClient.from('addresses').insert({
      client_id: cid,
      ...config.address
    });

    // C. Collaborators
    const collabIds = {};
    for (const name of config.collaborators) {
      const { data: collab } = await userClient.from('collaborators').insert({
        user_id: userId,
        client_id: cid,
        name
      }).select().single();
      
      collabIds[name] = collab.id;
    }

    // D. Parent Categories
    const parentIds = {};
    for (const pCat of config.parentCategories) {
      const { data: category } = await userClient.from('categories').insert({
        user_id: userId,
        client_id: cid,
        name: pCat.name,
        type: pCat.type,
        code: pCat.code,
        sort_order: pCat.sort_order,
        parent_id: null
      }).select().single();
      parentIds[pCat.name] = category.id;
    }

    // E. Subcategories
    const catIds = {};
    for (const subCat of config.subcategories) {
      const parentId = parentIds[subCat.parentName];
      const { data: category } = await userClient.from('categories').insert({
        user_id: userId,
        client_id: cid,
        name: subCat.name,
        type: subCat.type,
        code: subCat.code,
        sort_order: subCat.sort_order,
        parent_id: parentId
      }).select().single();
      
      catIds[subCat.name] = category.id;
    }

    // F. Transactions
    const txData = config.transactions(collabIds, catIds);
    for (const tx of txData) {
      await userClient.from('transactions').insert({
        user_id: userId,
        client_id: cid,
        ...tx
      });
    }
  }

  console.log("\n✨ Database seeding completed successfully!");
  console.log("-----------------------------------------");
  console.log(`Login: ${email}`);
  console.log(`Password: ${password}`);
  console.log("-----------------------------------------");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});

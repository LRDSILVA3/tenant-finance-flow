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

  // Fetch only clients owned by THIS user
  const { data: myClients, error: clientsError } = await userClient
    .from('clients')
    .select('id, name, user_id')
    .eq('user_id', userId);

  if (clientsError || !myClients || myClients.length === 0) {
    console.error("❌ No clients found for user:", clientsError?.message);
    process.exit(1);
  }

  // We will populate data specifically for "Mercado Ponto Certo" (first client)
  const client = myClients.find(c => c.name.includes("Mercado")) || myClients[0];
  const cid = client.id;
  console.log(`🏢 Selected Target Client: ${client.name} (${cid})`);

  // Ensure user settings
  await userClient.from('user_settings').upsert({
    user_id: userId,
    enable_payment_methods: true,
    enable_commission: true
  });

  // 1. FORNECEDORES
  console.log("🚚 1. Seeding Fornecedores...");
  const suppliersData = [
    { name: 'Ambev Brasil Distribuição', contact_info: 'pedidos@ambev.com.br | (11) 3456-7890' },
    { name: 'Nestlé Alimentos & Laticínios', contact_info: 'comercial@nestle.com.br | (11) 4004-1234' },
    { name: 'Moinho Paulista Panificação', contact_info: 'vendas@moinhopaulista.com.br | (11) 2345-6789' },
    { name: 'Hortifruti & Orgânicos da Serra', contact_info: 'organicos@serra.com.br | (11) 98765-1122' },
    { name: 'Distribuidora Aurora Carnes & Frios', contact_info: 'atendimento@aurora.com.br | (11) 99887-2233' },
    { name: 'Limpeza Total Produtos de Higiene', contact_info: 'sac@limpezatotal.com.br | (11) 3222-4455' }
  ];

  const supplierMap = {};
  for (const s of suppliersData) {
    const { data: existing } = await userClient
      .from('suppliers')
      .select('id')
      .eq('client_id', cid)
      .eq('name', s.name)
      .maybeSingle();

    if (existing) {
      supplierMap[s.name] = existing.id;
    } else {
      const { data: created } = await userClient.from('suppliers').insert({
        client_id: cid,
        name: s.name,
        contact_info: s.contact_info
      }).select().single();
      if (created) supplierMap[s.name] = created.id;
    }
  }
  console.log(`✅ Fornecedores prontos: ${Object.keys(supplierMap).length}`);

  // 2. CLIENTES (CRM)
  console.log("👥 2. Seeding Clientes (CRM)...");
  const customersData = [
    { name: 'Carlos Eduardo Mendonça', phone: '(11) 98765-4321', email: 'carlos.mendonca@gmail.com', document: '123.456.789-00', notes: 'Cliente preferencial, prefere entrega aos sábados.' },
    { name: 'Mariana Guimarães Rocha', phone: '(11) 97654-3210', email: 'mariana.rocha@outlook.com', document: '234.567.890-11', notes: 'Compras corporativas para escritório.' },
    { name: 'Padaria & Confeitaria Doce Sabor', phone: '(11) 96543-2109', email: 'contato@docesabor.com.br', document: '18.234.567/0001-88', notes: 'Fornecimento semanal de frios e laticínios.' },
    { name: 'Restaurante Estrela Gourmet', phone: '(11) 95432-1098', email: 'compras@estrelagourmet.com.br', document: '24.567.890/0001-44', notes: 'Faturamento mensal com vencimento dia 15.' },
    { name: 'Juliana Costa Martins', phone: '(11) 94321-0987', email: 'juliana.martins@yahoo.com.br', document: '345.678.901-22', notes: 'Aniversariante do mês.' },
    { name: 'Fernando Dias Alcantara', phone: '(11) 93210-9876', email: 'fernando.alcantara@gmail.com', document: '456.789.012-33', notes: 'Pagamentos via Pix.' },
    { name: 'Beatriz Helena Vasconcelos', phone: '(11) 92109-8765', email: 'beatriz.vasconcelos@empresa.com.br', document: '567.890.123-44', notes: 'Cliente frequente no PDV.' }
  ];

  const customerMap = {};
  for (const c of customersData) {
    const { data: existing } = await userClient
      .from('customers')
      .select('id')
      .eq('client_id', cid)
      .eq('name', c.name)
      .maybeSingle();

    if (existing) {
      customerMap[c.name] = existing.id;
    } else {
      const { data: created } = await userClient.from('customers').insert({
        client_id: cid,
        name: c.name,
        phone: c.phone,
        email: c.email,
        document: c.document,
        notes: c.notes,
        is_active: true
      }).select().single();
      if (created) customerMap[c.name] = created.id;
    }
  }
  console.log(`✅ Clientes prontos: ${Object.keys(customerMap).length}`);

  // 3. COLABORADORES
  console.log("👔 3. Seeding Colaboradores...");
  const collaboratorsData = ["Lucas Souza", "Mariana Silva", "Roberto Alencar"];
  const collabMap = {};
  for (const name of collaboratorsData) {
    const { data: existing } = await userClient
      .from('collaborators')
      .select('id')
      .eq('client_id', cid)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      collabMap[name] = existing.id;
    } else {
      const { data: created } = await userClient.from('collaborators').insert({
        client_id: cid,
        user_id: userId,
        name
      }).select().single();
      if (created) collabMap[name] = created.id;
    }
  }
  console.log(`✅ Colaboradores prontos: ${Object.keys(collabMap).length}`);

  // 4. TIPOS DE SERVIÇO
  console.log("🛠️ 4. Seeding Tipos de Serviço...");
  const servicesData = [
    { name: 'Montagem de Cesta Personalizada', duration_minutes: 60, price: 75.00 },
    { name: 'Entrega Express Agendada', duration_minutes: 45, price: 35.00 },
    { name: 'Higienização e Embalagem a Vácuo', duration_minutes: 30, price: 25.00 },
    { name: 'Consultoria Nutricional de Produtos', duration_minutes: 60, price: 120.00 }
  ];

  const serviceMap = {};
  for (const s of servicesData) {
    const { data: existing } = await userClient
      .from('service_types')
      .select('id')
      .eq('client_id', cid)
      .eq('name', s.name)
      .maybeSingle();

    if (existing) {
      serviceMap[s.name] = existing.id;
    } else {
      const { data: created } = await userClient.from('service_types').insert({
        client_id: cid,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price: s.price,
        is_active: true
      }).select().single();
      if (created) serviceMap[s.name] = created.id;
    }
  }
  console.log(`✅ Tipos de Serviço prontos: ${Object.keys(serviceMap).length}`);

  // 5. AGENDAMENTOS (AGENDA)
  console.log("📅 5. Seeding Agendamentos...");
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');

  const appointmentsToInsert = [
    {
      title: 'Entrega Express Agendada',
      scheduled_at: `${y}-${m}-${d}T09:00:00.000Z`,
      duration_minutes: 45,
      price: 35.00,
      status: 'completed',
      customer_id: customerMap['Padaria & Confeitaria Doce Sabor'],
      service_type_id: serviceMap['Entrega Express Agendada'],
      collaborator_id: collabMap['Lucas Souza'],
      notes: 'Entregar na porta de serviço dos fundos.'
    },
    {
      title: 'Montagem de Cesta Personalizada',
      scheduled_at: `${y}-${m}-${d}T10:30:00.000Z`,
      duration_minutes: 60,
      price: 75.00,
      status: 'confirmed',
      customer_id: customerMap['Mariana Guimarães Rocha'],
      service_type_id: serviceMap['Montagem de Cesta Personalizada'],
      collaborator_id: collabMap['Mariana Silva'],
      notes: 'Cesta com queijos importados, vinhos e geleias finas.'
    },
    {
      title: 'Consultoria Nutricional de Produtos',
      scheduled_at: `${y}-${m}-${d}T14:30:00.000Z`,
      duration_minutes: 60,
      price: 120.00,
      status: 'in_progress',
      customer_id: customerMap['Carlos Eduardo Mendonça'],
      service_type_id: serviceMap['Consultoria Nutricional de Produtos'],
      collaborator_id: collabMap['Roberto Alencar'],
      notes: 'Plano alimentar e seleção de grãos nobres.'
    },
    {
      title: 'Entrega Express Agendada',
      scheduled_at: `${y}-${m}-${d}T16:00:00.000Z`,
      duration_minutes: 45,
      price: 35.00,
      status: 'scheduled',
      customer_id: customerMap['Restaurante Estrela Gourmet'],
      service_type_id: serviceMap['Entrega Express Agendada'],
      collaborator_id: collabMap['Lucas Souza'],
      notes: 'Lote de bebidas e insumos de cozinha.'
    }
  ];

  for (const app of appointmentsToInsert) {
    await userClient.from('appointments').insert({
      client_id: cid,
      ...app
    });
  }
  console.log(`✅ Agendamentos inseridos com sucesso.`);

  // 6. ESCALAS DE TRABALHO
  console.log("⏰ 6. Seeding Escalas de Trabalho...");
  const sampleSchedule = {
    monday: { enabled: true, shifts: [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "18:00" }] },
    tuesday: { enabled: true, shifts: [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "18:00" }] },
    wednesday: { enabled: true, shifts: [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "18:00" }] },
    thursday: { enabled: true, shifts: [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "18:00" }] },
    friday: { enabled: true, shifts: [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "18:00" }] },
    saturday: { enabled: true, shifts: [{ start: "08:00", end: "13:00" }] },
    sunday: { enabled: false, shifts: [] }
  };

  try {
    await userClient.from('collaborator_schedules').upsert({
      client_id: cid,
      collaborator_id: null,
      schedule_data: sampleSchedule,
      updated_at: new Date().toISOString()
    }, { onConflict: 'client_id,collaborator_id' });
    console.log(`✅ Escala geral configurada.`);
  } catch (e) {
    console.warn("Notice: collaborator_schedules upsert:", e.message);
  }

  // 7. FORMAS DE PAGAMENTO PERSONALIZADAS
  console.log("💳 7. Seeding Formas de Pagamento Personalizadas...");
  const paymentMethods = [
    { name: 'Crediário Loja 30D', parent_type: 'other' },
    { name: 'Vale Refeição Alelo', parent_type: 'card' },
    { name: 'Boleto Faturado PJ', parent_type: 'boleto' }
  ];

  for (const pm of paymentMethods) {
    try {
      await userClient.from('client_payment_methods').upsert({
        client_id: cid,
        name: pm.name,
        parent_type: pm.parent_type
      }, { onConflict: 'client_id,name' });
    } catch (e) {
      console.warn("Notice: client_payment_methods upsert:", e.message);
    }
  }
  console.log(`✅ Formas de pagamento configuradas.`);

  // 8. PRODUTOS & ESTOQUE (COM HUB DE PERECÍVEIS E VALIDADES)
  console.log("📦 8. Seeding Produtos com Validades e Estoque...");
  const dExpiring3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dExpiring5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dFuture60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dFuture120Days = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const productsList = [
    { name: 'Coca-Cola Lata 350ml', sku: 'BEB-COCA-350', cost_price: 2.50, sale_price: 5.00, current_stock: 140, min_stock: 40, supplier_id: supplierMap['Ambev Brasil Distribuição'], expiration_date: dFuture120Days },
    { name: 'Cerveja Heineken Long Neck 330ml', sku: 'BEB-HEIN-330', cost_price: 4.80, sale_price: 8.90, current_stock: 85, min_stock: 30, supplier_id: supplierMap['Ambev Brasil Distribuição'], expiration_date: dFuture60Days },
    { name: 'Suco de Laranja Integral 1L', sku: 'BEB-SUCO-LAR', cost_price: 6.50, sale_price: 12.00, current_stock: 24, min_stock: 15, supplier_id: supplierMap['Hortifruti & Orgânicos da Serra'], expiration_date: dExpiring5Days },
    { name: 'Iogurte Grego Tradicional 400g', sku: 'LAT-IOG-400', cost_price: 5.20, sale_price: 9.50, current_stock: 18, min_stock: 10, supplier_id: supplierMap['Nestlé Alimentos & Laticínios'], expiration_date: dExpiring3Days },
    { name: 'Queijo Mussarela Fatiado 500g', sku: 'FRI-QUEI-500', cost_price: 16.00, sale_price: 26.90, current_stock: 35, min_stock: 15, supplier_id: supplierMap['Distribuidora Aurora Carnes & Frios'], expiration_date: dFuture60Days },
    { name: 'Pão de Forma Tradicional Artesanal', sku: 'PAN-PAO-FORM', cost_price: 4.50, sale_price: 8.50, current_stock: 6, min_stock: 15, supplier_id: supplierMap['Moinho Paulista Panificação'], expiration_date: dExpiring5Days },
    { name: 'Café Torrado Especial Gourmet 500g', sku: 'MER-CAFE-500', cost_price: 15.00, sale_price: 25.90, current_stock: 50, min_stock: 20, supplier_id: supplierMap['Nestlé Alimentos & Laticínios'], expiration_date: dFuture120Days },
    { name: 'Azeite de Oliva Extra Virgem 500ml', sku: 'MER-AZEI-500', cost_price: 28.00, sale_price: 44.90, current_stock: 40, min_stock: 15, supplier_id: supplierMap['Moinho Paulista Panificação'], expiration_date: dFuture120Days },
    { name: 'Arroz Tipo 1 Nobre 5kg', sku: 'GRA-ARRO-5K', cost_price: 22.00, sale_price: 34.90, current_stock: 65, min_stock: 25, supplier_id: supplierMap['Moinho Paulista Panificação'], expiration_date: dFuture120Days },
    { name: 'Feijão Carioca Selecionado 1kg', sku: 'GRA-FEIJ-1K', cost_price: 6.80, sale_price: 10.90, current_stock: 45, min_stock: 20, supplier_id: supplierMap['Moinho Paulista Panificação'], expiration_date: dFuture120Days },
    { name: 'Detergente Neutro Concentrado 500ml', sku: 'LIM-DETE-500', cost_price: 1.80, sale_price: 3.20, current_stock: 90, min_stock: 30, supplier_id: supplierMap['Limpeza Total Produtos de Higiene'], expiration_date: dFuture120Days }
  ];

  const productMap = {};
  for (const p of productsList) {
    const { data: existing } = await userClient
      .from('products')
      .select('id')
      .eq('client_id', cid)
      .eq('sku', p.sku)
      .maybeSingle();

    if (existing) {
      await userClient.from('products').update({
        current_stock: p.current_stock,
        min_stock: p.min_stock,
        cost_price: p.cost_price,
        sale_price: p.sale_price,
        expiration_date: p.expiration_date,
        supplier_id: p.supplier_id
      }).eq('id', existing.id);
      productMap[p.name] = existing.id;
    } else {
      const { data: created } = await userClient.from('products').insert({
        client_id: cid,
        name: p.name,
        sku: p.sku,
        cost_price: p.cost_price,
        sale_price: p.sale_price,
        current_stock: p.current_stock,
        min_stock: p.min_stock,
        supplier_id: p.supplier_id,
        expiration_date: p.expiration_date
      }).select().single();
      if (created) {
        productMap[p.name] = created.id;
        await userClient.from('stock_movements').insert({
          client_id: cid,
          product_id: created.id,
          type: 'in',
          quantity: p.current_stock,
          cost_price: p.cost_price,
          notes: 'Carga inicial e reposição'
        });
      }
    }
  }
  console.log(`✅ Produtos atualizados com validades e alertas.`);

  // 9. PEDIDOS DE VENDA
  console.log("🛒 9. Seeding Pedidos de Venda...");
  const sampleOrders = [
    {
      order_number: 'PED-1001',
      customer_id: customerMap['Restaurante Estrela Gourmet'],
      collaborator_id: collabMap['Lucas Souza'],
      status: 'completed',
      subtotal_amount: 1450.00,
      discount_amount: 50.00,
      total_amount: 1400.00,
      payment_method: 'pix',
      payment_status: 'paid',
      notes: 'Pedido corporativo com entrega rápida.'
    },
    {
      order_number: 'PED-1002',
      customer_id: customerMap['Padaria & Confeitaria Doce Sabor'],
      collaborator_id: collabMap['Mariana Silva'],
      status: 'completed',
      subtotal_amount: 890.00,
      discount_amount: 0.00,
      total_amount: 890.00,
      payment_method: 'card',
      payment_status: 'paid',
      notes: 'Insumos de café da manhã.'
    },
    {
      order_number: 'PED-1003',
      customer_id: customerMap['Carlos Eduardo Mendonça'],
      collaborator_id: collabMap['Lucas Souza'],
      status: 'completed',
      subtotal_amount: 245.50,
      discount_amount: 0.00,
      total_amount: 245.50,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Atendimento balcão PDV.'
    },
    {
      order_number: 'PED-1004',
      customer_id: customerMap['Mariana Guimarães Rocha'],
      collaborator_id: collabMap['Roberto Alencar'],
      status: 'pending',
      subtotal_amount: 380.00,
      discount_amount: 0.00,
      total_amount: 380.00,
      payment_method: 'boleto',
      payment_status: 'pending',
      due_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Boleto faturado para 7 dias.'
    },
    {
      order_number: 'PED-1005',
      customer_id: customerMap['Juliana Costa Martins'],
      collaborator_id: collabMap['Mariana Silva'],
      status: 'draft',
      subtotal_amount: 560.00,
      discount_amount: 20.00,
      total_amount: 540.00,
      payment_method: 'pix',
      payment_status: 'pending',
      notes: 'Orçamento de cesta comemorativa.'
    }
  ];

  for (const ord of sampleOrders) {
    const { data: createdOrd } = await userClient.from('orders').insert({
      client_id: cid,
      ...ord
    }).select().single();

    if (createdOrd) {
      // Add items
      const sampleProdId = Object.values(productMap)[0];
      if (sampleProdId) {
        await userClient.from('order_items').insert({
          order_id: createdOrd.id,
          product_id: sampleProdId,
          quantity: 2,
          unit_price: 50.00,
          cost_price: 25.00,
          total_price: 100.00
        });
      }
    }
  }
  console.log(`✅ Pedidos de venda inseridos com sucesso.`);

  // 10. ORDENS DE SERVIÇO
  console.log("📋 10. Seeding Ordens de Serviço...");
  const sampleOS = [
    {
      os_number: 'OS-2001',
      customer_id: customerMap['Restaurante Estrela Gourmet'],
      collaborator_id: collabMap['Roberto Alencar'],
      status: 'completed',
      title: 'Manutenção Preventiva de Fatiador Industrial',
      equipment_info: 'Fatiador de Frios Skymsen 300mm Inox',
      reported_defect: 'Lâmina descalibrada e motor superaquecendo.',
      technical_diagnosis: 'Desmontagem, afiação da lâmina, troca da correia e lubrificação.',
      warranty_terms: '90 dias de garantia sobre a mão de obra e peças aplicadas.',
      services_total: 250.00,
      products_total: 180.00,
      total_amount: 430.00,
      payment_method: 'pix',
      payment_status: 'paid'
    },
    {
      os_number: 'OS-2002',
      customer_id: customerMap['Padaria & Confeitaria Doce Sabor'],
      collaborator_id: collabMap['Lucas Souza'],
      status: 'in_progress',
      title: 'Instalação e Calibração de Balança Comercial',
      equipment_info: 'Balança Toledo Prix 3 Fit',
      reported_defect: 'Variação de pesagem e etiqueta desalinhada.',
      technical_diagnosis: 'Reconfiguração dos sensores de peso e alinhamento do rolete térmico.',
      warranty_terms: '90 dias de garantia de serviço.',
      services_total: 180.00,
      products_total: 0.00,
      total_amount: 180.00,
      payment_method: 'card',
      payment_status: 'pending'
    },
    {
      os_number: 'OS-2003',
      customer_id: customerMap['Fernando Dias Alcantara'],
      collaborator_id: collabMap['Roberto Alencar'],
      status: 'waiting_parts',
      title: 'Higienização e Troca de Filtro de Máquina de Café',
      equipment_info: 'Máquina Saeco Aulika Top',
      reported_defect: 'Fluxo fraco de café e erro no visor.',
      technical_diagnosis: 'Descalcificação geral e substituição da bomba de pressão.',
      services_total: 150.00,
      products_total: 90.00,
      total_amount: 240.00,
      payment_method: 'cash',
      payment_status: 'pending'
    },
    {
      os_number: 'OS-2004',
      customer_id: customerMap['Beatriz Helena Vasconcelos'],
      collaborator_id: collabMap['Mariana Silva'],
      status: 'budget',
      title: 'Orçamento de Montagem de Espaço Gourmet Comercial',
      equipment_info: 'Bancada refrigerada e estufa térmica',
      reported_defect: 'Planejamento de instalação elétrica e layout.',
      services_total: 350.00,
      products_total: 0.00,
      total_amount: 350.00,
      payment_method: 'pix',
      payment_status: 'pending'
    }
  ];

  for (const os of sampleOS) {
    await userClient.from('service_orders').insert({
      client_id: cid,
      ...os
    });
  }
  console.log(`✅ Ordens de serviço inseridas com sucesso.`);

  // 11. TRANSAÇÕES ATUAIS (SETEMBRO 2026) E CONTAS A PAGAR/RECEBER
  console.log("💰 11. Seeding Transações do Mês Atual (Recebíveis e Pagáveis)...");
  
  // Fetch existing categories
  const { data: categories } = await userClient
    .from('categories')
    .select('id, name, type')
    .eq('client_id', cid);

  const catVendas = categories?.find(c => c.name === 'Vendas')?.id;
  const catServicos = categories?.find(c => c.name === 'Prestações de Serviços')?.id;
  const catAluguel = categories?.find(c => c.name === 'Aluguel')?.id;
  const catSalarios = categories?.find(c => c.name === 'Salários')?.id;
  const catFornec = categories?.find(c => c.name === 'Fornecedores')?.id;
  const catMarketing = categories?.find(c => c.name === 'Marketing')?.id;

  const currentMonthTransactions = [
    // Receitas Pagas (Setembro)
    { description: 'Venda Balcão Frente de Loja (Semana 1)', type: 'income', amount: 8450.00, date: `${y}-${m}-02`, status: 'paid', payment_method: 'pix', category_id: catVendas },
    { description: 'Serviço de Entrega & Cestas Especiais', type: 'income', amount: 1850.00, date: `${y}-${m}-05`, status: 'paid', payment_method: 'card', category_id: catServicos, collaborator_id: collabMap['Lucas Souza'], commission_amount: 92.50 },
    { description: 'Faturamento Pedido Restaurante Estrela Gourmet', type: 'income', amount: 1400.00, date: `${y}-${m}-07`, status: 'paid', payment_method: 'pix', category_id: catVendas, customer_id: customerMap['Restaurante Estrela Gourmet'] },
    
    // Receitas Pendentes (Contas a Receber)
    { description: 'Fatura Mensal - Padaria Doce Sabor', type: 'income', amount: 2890.00, date: `${y}-${m}-${d}`, status: 'pending', payment_method: 'boleto', category_id: catVendas, customer_id: customerMap['Padaria & Confeitaria Doce Sabor'] },
    { description: 'Contrato Fornecimento - Mariana Rocha', type: 'income', amount: 1380.00, date: `${y}-${m}-15`, status: 'pending', payment_method: 'pix', category_id: catVendas, customer_id: customerMap['Mariana Guimarães Rocha'] },
    { description: 'Ordem de Serviço #2002 - Confeitaria', type: 'income', amount: 180.00, date: `${y}-${m}-18`, status: 'pending', payment_method: 'card', category_id: catServicos, customer_id: customerMap['Padaria & Confeitaria Doce Sabor'] },
    
    // Despesas Pagas (Setembro)
    { description: 'Aluguel do Ponto Comercial (Setembro)', type: 'expense', amount: 4500.00, date: `${y}-${m}-05`, status: 'paid', payment_method: 'pix', category_id: catAluguel },
    { description: 'Campanha Anúncios Redes Sociais', type: 'expense', amount: 950.00, date: `${y}-${m}-04`, status: 'paid', payment_method: 'card', category_id: catMarketing },
    
    // Despesas Pendentes (Contas a Pagar)
    { description: 'Duplicata Ambev Brasil - Lote Bebidas', type: 'expense', amount: 3200.00, date: `${y}-${m}-${d}`, status: 'pending', payment_method: 'boleto', category_id: catFornec, supplier_id: supplierMap['Ambev Brasil Distribuição'] },
    { description: 'Fornecedor Nestlé - Reposição Laticínios', type: 'expense', amount: 1850.00, date: `${y}-${m}-12`, status: 'pending', payment_method: 'boleto', category_id: catFornec, supplier_id: supplierMap['Nestlé Alimentos & Laticínios'] },
    { description: 'Folha de Pagamento Adiantamento', type: 'expense', amount: 3500.00, date: `${y}-${m}-20`, status: 'pending', payment_method: 'pix', category_id: catSalarios },
    { description: 'Fatura Fornecedor Moinho Paulista', type: 'expense', amount: 1250.00, date: `${y}-${m}-25`, status: 'pending', payment_method: 'boleto', category_id: catFornec, supplier_id: supplierMap['Moinho Paulista Panificação'] }
  ];

  for (const tx of currentMonthTransactions) {
    await userClient.from('transactions').insert({
      user_id: userId,
      client_id: cid,
      ...tx
    });
  }
  console.log(`✅ Transações de Setembro inseridas com sucesso.`);

  console.log("\n🎉 POPULAÇÃO COMPLETA CONCLUÍDA COM SUCESSO!");
  console.log("Todas as estruturas estão preenchidas de forma rica e realista.");
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});

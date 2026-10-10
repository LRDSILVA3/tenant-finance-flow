/**
 * Script de Importação de Produtos e Estoque para a cliente Ana Brentano
 * Arquivo de origem: estoque_ana.xlsx
 * 
 * Uso:
 *   node scripts/import_estoque_ana.mjs [opções]
 * 
 * Opções:
 *   --email ana.brentano1992@gmail.com   (padrão: ana.brentano1992@gmail.com)
 *   --password <senha>                   (senha do usuário no Supabase)
 *   --file estoque_ana.xlsx              (caminho da planilha, padrão: estoque_ana.xlsx)
 *   --client-id <uuid>                   (forçar client_id específico)
 */

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// 1. Ler variáveis do .env
const envText = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios no arquivo .env');
  process.exit(1);
}

// 2. Processar argumentos CLI
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const targetEmail = getArg('--email', 'ana.brentano1992@gmail.com');
const userPassword = getArg('--password', process.env.ANA_PASSWORD || null);
const excelFilePath = getArg('--file', 'estoque_ana.xlsx');
let forcedClientId = getArg('--client-id', null);

console.log('====================================================');
console.log('📦 IMPORTADOR DE ESTOQUE - TENANT FINANCE FLOW');
console.log('====================================================');
console.log(`👤 Cliente / Usuário Alvo: ${targetEmail}`);
console.log(`📄 Planilha: ${excelFilePath}`);

// 3. Ler arquivo Excel
if (!fs.existsSync(excelFilePath)) {
  console.error(`❌ Arquivo "${excelFilePath}" não encontrado!`);
  process.exit(1);
}

const workbook = xlsx.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

console.log(`📊 Planilha carregada: ${sheetName} com ${rawRows.length} linhas de dados.\n`);

async function main() {
  let supabaseClient;
  let userId;
  let clientId = forcedClientId;

  if (SUPABASE_SERVICE_ROLE) {
    console.log('🔑 Usando Supabase Service Role Key (Acesso Administrativo)...');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    // Localizar usuário por email
    const { data: usersData, error: uErr } = await supabaseClient.auth.admin.listUsers();
    if (uErr) {
      console.error('Erro ao listar usuários via admin:', uErr.message);
    } else {
      const user = usersData.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
      if (user) {
        userId = user.id;
        console.log(`✅ Usuário encontrado: ${user.email} (ID: ${userId})`);
      }
    }
  } else if (userPassword) {
    console.log(`🔐 Autenticando com usuário ${targetEmail}...`);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password: userPassword,
    });

    if (authErr) {
      console.error(`❌ Falha na autenticação: ${authErr.message}`);
      console.error('Verifique a senha informada via --password.');
      process.exit(1);
    }

    userId = authData.user.id;
    console.log(`✅ Autenticado com sucesso! ID: ${userId}`);

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
    });
  } else {
    console.log('⚠️ Nenhuma senha (--password) ou Service Role Key fornecida.');
    console.log('ℹ️ Dica: você pode executar via Node passando a senha:');
    console.log(`   node scripts/import_estoque_ana.mjs --password "SUA_SENHA"`);
    console.log('ℹ️ Ou executar diretamente o script SQL no Supabase SQL Editor:');
    console.log(`   scripts/import_estoque_ana.sql\n`);
    
    // Tentar login padrão ou signup se não existir
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const defaultPass = 'Ana123456!';
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password: defaultPass,
    });

    if (!signInErr && signInData?.session) {
      userId = signInData.user.id;
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } }
      });
      console.log(`✅ Conectado com sucesso com a senha padrão.`);
    } else {
      console.log('----------------------------------------------------');
      console.log('📋 Para rodar este script via terminal, informe a senha da Ana:');
      console.log(`node scripts/import_estoque_ana.mjs --password "SENHA_AQUI"`);
      console.log('Ou se preferir, execute o arquivo gerado scripts/import_estoque_ana.sql diretamente no painel do Supabase!');
      console.log('----------------------------------------------------');
      return;
    }
  }

  // 4. Obter ou Criar Tenant / Client
  if (!clientId) {
    const { data: clients, error: cErr } = await supabaseClient
      .from('clients')
      .select('id, name')
      .limit(5);

    if (cErr) {
      console.error('❌ Erro ao consultar clientes:', cErr.message);
      process.exit(1);
    }

    if (clients && clients.length > 0) {
      clientId = clients[0].id;
      console.log(`🏢 Usando cliente existente: "${clients[0].name}" (ID: ${clientId})`);
    } else {
      console.log('🏢 Criando novo cliente/loja para Ana Brentano...');
      const { data: newClient, error: ncErr } = await supabaseClient
        .from('clients')
        .insert({
          user_id: userId,
          name: 'Loja Ana Brentano',
        })
        .select()
        .single();

      if (ncErr) {
        console.error('❌ Erro ao criar cliente:', ncErr.message);
        process.exit(1);
      }
      clientId = newClient.id;
      console.log(`✅ Loja criada com ID: ${clientId}`);
    }
  }

  // 5. Garantir Fornecedores (DMELLOS e ABELHA RAINHA)
  console.log('\n🏷️ Verificando fornecedores...');
  const { data: existingSuppliers, error: sErr } = await supabaseClient
    .from('suppliers')
    .select('id, name')
    .eq('client_id', clientId);

  const supplierMap = {};
  if (existingSuppliers) {
    existingSuppliers.forEach(s => {
      supplierMap[s.name.trim().toUpperCase()] = s.id;
    });
  }

  async function ensureSupplier(name, contactInfo) {
    const upper = name.trim().toUpperCase();
    if (supplierMap[upper]) return supplierMap[upper];

    const { data: newSupp, error } = await supabaseClient
      .from('suppliers')
      .insert({
        client_id: clientId,
        name: name.trim(),
        contact_info: contactInfo
      })
      .select()
      .single();

    if (error) {
      console.error(`Erro ao criar fornecedor ${name}:`, error.message);
      return null;
    }

    supplierMap[upper] = newSupp.id;
    console.log(`➕ Fornecedor cadastrado: "${name}" (ID: ${newSupp.id})`);
    return newSupp.id;
  }

  const suppDmellosId = await ensureSupplier('DMELLOS', 'Fornecedor de Lingerie e Moda Íntima');
  const suppAbelhaId = await ensureSupplier('ABELHA RAINHA', 'Fornecedor de Cosméticos e Beleza');

  // 6. Processar e Inserir Produtos
  console.log('\n🚀 Importando produtos e movimentações de estoque...');
  let importedCount = 0;
  let totalQtySum = 0;
  let totalValueSum = 0;
  let errorsCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const cod = String(r['Cod '] || r['Cod'] || '').trim();
    const desc = String(r['Descrição'] || r['Descricao'] || '').trim();
    const brand = String(r[' Marca'] || r['Marca'] || '').trim().toUpperCase();
    const size = String(r['Tamanho'] || '').trim().toUpperCase();
    const color = String(r['Cor'] || '').trim().toUpperCase();
    const qty = Number(r['Quantidade']) || 0;
    const salePrice = Number(r[' volor de venda '] || r['valor de venda'] || 0);
    const stockVal = Number(r[' VALOR DE ESQ '] || r['VALOR DE ESQ'] || (qty * salePrice));

    if (!desc) continue;

    // Nome completo com tamanho e cor se aplicável
    let fullName = desc;
    const details = [];
    if (size) details.push(`Tam: ${size}`);
    if (color) details.push(`Cor: ${color}`);
    if (details.length > 0) {
      fullName = `${desc} (${details.join(' - ')})`;
    }

    const isAbelha = brand.includes('ABELHA');
    const supplierId = isAbelha ? suppAbelhaId : suppDmellosId;
    const category = isAbelha ? 'Cosméticos' : 'Moda Íntima';
    const fullDesc = `Marca: ${brand}${size ? ' | Tamanho: ' + size : ''}${color ? ' | Cor: ' + color : ''}${cod ? ' | Cód: ' + cod : ''}`;

    try {
      // Inserir produto com estoque inicial 0 (o trigger de movimentação irá alimentar o current_stock)
      const { data: newProd, error: pError } = await supabaseClient
        .from('products')
        .insert({
          client_id: clientId,
          supplier_id: supplierId,
          name: fullName,
          sku: cod || `ITEM-${i + 1}`,
          cost_price: 0,
          sale_price: salePrice,
          current_stock: 0,
          min_stock: 0,
          category,
          unit: 'UN',
          description: fullDesc
        })
        .select()
        .single();

      if (pError) {
        console.error(`❌ [Linha ${i + 2}] Erro ao cadastrar "${fullName}":`, pError.message);
        errorsCount++;
        continue;
      }

      // Inserir movimentação de entrada inicial
      if (qty > 0 && newProd) {
        const { error: mError } = await supabaseClient
          .from('stock_movements')
          .insert({
            client_id: clientId,
            product_id: newProd.id,
            type: 'in',
            quantity: qty,
            notes: 'Estoque inicial importado da planilha estoque_ana.xlsx'
          });

        if (mError) {
          console.warn(`⚠️ [Linha ${i + 2}] Erro ao registrar movimentação de estoque:`, mError.message);
        }
      }

      importedCount++;
      totalQtySum += qty;
      totalValueSum += stockVal;

      if (importedCount % 20 === 0 || importedCount === rawRows.length) {
        console.log(`📦 Progresso: ${importedCount}/${rawRows.length} produtos importados...`);
      }
    } catch (err) {
      console.error(`❌ Erro inesperado na linha ${i + 2}:`, err);
      errorsCount++;
    }
  }

  console.log('\n====================================================');
  console.log('🎉 RESUMO DA IMPORTAÇÃO');
  console.log('====================================================');
  console.log(`✅ Total de Produtos Importados: ${importedCount}`);
  console.log(`📦 Quantidade Total de Peças/Unidades: ${totalQtySum}`);
  console.log(`💰 Valor Total do Estoque em Venda: R$ ${totalValueSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  if (errorsCount > 0) {
    console.log(`⚠️ Produtos com erro: ${errorsCount}`);
  }
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
});

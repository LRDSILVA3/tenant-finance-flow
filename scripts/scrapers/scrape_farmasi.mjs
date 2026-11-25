/**
 * Scraper Oficial do Catálogo Farmasi Brasil
 * Extrai todos os produtos, códigos, nomes, fotos, preços de catálogo e categorias da Farmasi.
 * 
 * Uso:
 *   node scripts/scrapers/scrape_farmasi.mjs
 *   node scripts/scrapers/scrape_farmasi.mjs --limit 20   (para teste rápido)
 *   node scripts/scrapers/scrape_farmasi.mjs --margin 35  (margem de consultora padrão, default: 35%)
 */

import fs from 'fs';
import path from 'path';

// Argumentos CLI
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const limitArg = parseInt(getArg('--limit', '0'), 10);
const consultantMarginPercent = parseFloat(getArg('--margin', '35')); // Margem padrão Farmasi = 35%
const marginMultiplier = (100 - consultantMarginPercent) / 100;

console.log('====================================================');
console.log('🌿 SCRAPER DO CATÁLOGO FARMASI BRASIL');
console.log('====================================================');
console.log(`💼 Margem padrão da consultora: ${consultantMarginPercent}%`);
if (limitArg > 0) console.log(`⚡ Modo limitado: processando até ${limitArg} produtos.`);

// Função auxiliar de atraso
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Categorização inteligente para Farmasi
function inferCategoryAndLine(name, content = '') {
  const text = `${name} ${content}`.toLowerCase();
  
  let line = 'Farmasi';
  if (text.includes('dr. c. tuna') || text.includes('dr c tuna')) {
    line = 'Dr. C. Tuna';
  } else if (text.includes('vfx pro')) {
    line = 'VFX Pro';
  } else if (text.includes('nutriplus')) {
    line = 'Nutriplus';
  } else if (text.includes('hera') || text.includes('reina') || text.includes('monsieur') || text.includes('glamour') || text.includes('shooting star')) {
    line = 'Perfumaria Fina';
  }

  let category = 'Geral';
  if (text.includes('perfume') || text.includes('eau de parfum') || text.includes('edp') || text.includes('desodorante') || line === 'Perfumaria Fina') {
    category = 'Perfumaria';
  } else if (text.includes('batom') || text.includes('mascara') || text.includes('máscara') || text.includes('base') || text.includes('powder') || text.includes('pó') || text.includes('blush') || text.includes('corretivo') || text.includes('delineador') || text.includes('sombra') || text.includes('gloss') || line === 'VFX Pro') {
    category = 'Maquiagem';
  } else if (text.includes('shampoo') || text.includes('condicionador') || text.includes('cabelo') || text.includes('capilar') || text.includes('hair')) {
    category = 'Cabelos';
  } else if (text.includes('sérum') || text.includes('serum') || text.includes('facial') || text.includes('rosto') || text.includes('olhos') || text.includes('hidratante facial') || text.includes('resurface') || text.includes('age reversist')) {
    category = 'Cuidados Faciais';
  } else if (text.includes('páprica') || text.includes('paprika') || text.includes('sabonete') || text.includes('corpo') || text.includes('massage') || text.includes('massagem') || text.includes('hidratante corporal') || text.includes('gel de')) {
    category = 'Cuidados Corporais';
  } else if (text.includes('nutriplus') || text.includes('colágeno') || text.includes('colageno') || text.includes('vitamina') || text.includes('chá') || text.includes('shake')) {
    category = 'Nutracêuticos';
  } else if (text.includes('kit') || text.includes('set') || text.includes('bag') || text.includes('bolsa') || text.includes('necessaire')) {
    category = 'Kits & Acessórios';
  }

  return { category, line };
}

async function scrapeFarmasi() {
  // 1. Obter BuildId dinâmico da Home
  console.log('\n🔍 [1/3] Detectando versão e BuildId da Farmasi...');
  const homeRes = await globalThis.fetch('https://farmasi.com.br');
  if (!homeRes.ok) throw new Error(`Falha ao conectar na home da Farmasi: HTTP ${homeRes.status}`);
  const homeHtml = await homeRes.text();
  
  const buildIdMatch = homeHtml.match(/"buildId":"([^"]+)"/);
  const buildId = buildIdMatch ? buildIdMatch[1] : 'F4sAFivGxH1vtEby-rZrJ';
  console.log(`✅ BuildId detectado: ${buildId}`);

  // 2. Obter URLs do sitemap
  console.log('\n📄 [2/3] Baixando sitemap oficial de produtos...');
  const smRes = await globalThis.fetch('https://farmasi.com.br/sitemap.xml');
  if (!smRes.ok) throw new Error(`Falha ao baixar sitemap: HTTP ${smRes.status}`);
  const smXml = await smRes.text();

  const urlMatches = [...smXml.matchAll(/<loc>(https:\/\/www\.farmasi\.com\.br\/farmasi\/product-detail\/([^?]+)\?pid=([^<]+))<\/loc>/g)];
  console.log(`✅ Total de produtos indexados no sitemap: ${urlMatches.length}`);

  let targets = urlMatches.map(m => ({ fullUrl: m[1], slug: m[2], pid: m[3] }));
  if (limitArg > 0) {
    targets = targets.slice(0, limitArg);
  }

  // 3. Raspagem paralela controlada (lotes de 5 com delay)
  console.log(`\n🚀 [3/3] Iniciando raspagem de ${targets.length} produtos...`);
  const products = [];
  const seenCodes = new Set();
  const batchSize = 5;

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (item) => {
      try {
        const jsonUrl = `https://www.farmasi.com.br/_next/data/${buildId}/farmasi/product-detail/${item.slug}.json?nickname=farmasi&slug=${item.slug}&pid=${item.pid}`;
        const res = await globalThis.fetch(jsonUrl);
        
        let pData = null;
        if (res.ok) {
          const json = await res.json();
          pData = json.pageProps?.productData || json.pageProps?.getProductDetailSSR?.product;
        }

        // Fallback: se JSON 404 (ex: buildId expirou), faz fetch do HTML direto
        if (!pData) {
          const htmlRes = await globalThis.fetch(item.fullUrl);
          if (htmlRes.ok) {
            const pHtml = await htmlRes.text();
            const startIdx = pHtml.indexOf('__NEXT_DATA__');
            if (startIdx !== -1) {
              const start = pHtml.indexOf('>', startIdx) + 1;
              const end = pHtml.indexOf('</script>', start);
              const data = JSON.parse(pHtml.slice(start, end));
              pData = data.props?.pageProps?.productData || data.props?.pageProps?.getProductDetailSSR?.product;
            }
          }
        }

        if (pData && pData.code && pData.name) {
          // Remover prefixo interno de pacote 'PK' / 'pk' do e-commerce da Farmasi (ex: PK102840 -> 102840)
          const cleanCode = String(pData.code).trim().replace(/^pk/i, '');
          
          if (seenCodes.has(cleanCode)) {
            return;
          }
          seenCodes.add(cleanCode);

          const rawPrice = Number(pData.retailPrice || pData.price || 0);
          const costPrice = Math.round(rawPrice * marginMultiplier * 100) / 100;
          const { category, line } = inferCategoryAndLine(pData.name, pData.content || '');
          const imageUrl = pData.images?.[0]?.imageUrl || pData.assets?.[0]?.imageUrl || '';
          
          let unit = 'UN';
          let sizeOrVariant = '';
          if (pData.weightValue && pData.weightType) {
            sizeOrVariant = `${pData.weightValue} ${pData.weightType}`;
            if (pData.weightType.toLowerCase() === 'ml') unit = 'ML';
            else if (pData.weightType.toLowerCase() === 'g') unit = 'G';
          }

          products.push({
            code: cleanCode,
            name: String(pData.name).trim(),
            brand: 'Farmasi',
            line: line,
            category: category,
            size_or_variant: sizeOrVariant,
            unit: unit,
            sale_price: 0, // Preço de venda NÃO é preenchido (fica a critério do lojista)
            cost_price: costPrice, // Preço de custo preenchido com o valor de aquisição da consultora
            retail_reference_price: rawPrice,
            image_url: imageUrl,
            description: (pData.content || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
          });
        }
      } catch (err) {
        console.warn(`⚠️ Erro ao processar item ${item.slug}:`, err.message);
      }
    }));

    const currentCount = Math.min(i + batchSize, targets.length);
    process.stdout.write(`\r⏳ Progresso: ${currentCount} / ${targets.length} produtos analisados...`);
    await sleep(200); // 200ms de cortesia entre lotes
  }

  console.log(`\n\n🎉 Raspagem concluída! ${products.length} produtos válidos obtidos.`);

  // 4. Salvar arquivos de saída
  const outDir = path.resolve('public', 'templates');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 4.1. Salvar JSON
  const jsonPath = path.join(outDir, 'catalogo_farmasi_modelo.json');
  fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`📁 Arquivo JSON salvo em: ${jsonPath}`);

  // 4.2. Salvar CSV compatível com o Importador do Previna
  // Formato: Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL
  const csvHeaders = 'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL\r\n';
  const csvRows = products.map((p) => {
    const saleStr = p.sale_price > 0 ? p.sale_price.toFixed(2).replace('.', ',') : ''; // Preço de venda vazio
    const costStr = p.cost_price.toFixed(2).replace('.', ',');
    const sugStr = (p.retail_reference_price || 0) > 0 ? p.retail_reference_price.toFixed(2).replace('.', ',') : '';
    const cleanName = p.name.replace(/;/g, ' - ');
    const cleanCat = p.category.replace(/;/g, ' ');
    const cleanSize = (p.size_or_variant || '').replace(/;/g, ' ');
    return `${p.code};${cleanName};Farmasi;${cleanSize};;${p.unit};${cleanCat};0;${saleStr};${costStr};${sugStr};${p.image_url}`;
  }).join('\r\n');

  const csvPath = path.join(outDir, 'catalogo_farmasi_modelo.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvHeaders + csvRows, 'utf8');
  console.log(`📊 Arquivo CSV salvo em: ${csvPath}`);

  // Amostra dos primeiros 5 produtos
  console.log('\n--- 🌟 AMOSTRA DO MODELO GERADO ---');
  products.slice(0, 5).forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.code}] ${p.name} (${p.line} / ${p.category})`);
    console.log(`   Preço de Custo (-${consultantMarginPercent}%): R$ ${p.cost_price.toFixed(2)} | Preço de Venda: (Livre / Não preenchido)`);
    console.log(`   Foto: ${p.image_url || 'Sem foto'}`);
  });
}

scrapeFarmasi().catch((err) => {
  console.error('\n❌ Erro fatal no scraper:', err);
  process.exit(1);
});

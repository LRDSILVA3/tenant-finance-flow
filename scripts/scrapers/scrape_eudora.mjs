/**
 * Scraper do Catálogo Oficial Eudora Brasil (Grupo Boticário)
 * Gera modelos CSV e JSON compatíveis com o Previna
 */

import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function unescapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

export async function scrapeEudora(limit = 250) {
  console.log('✨ Iniciando extração do catálogo oficial da Eudora Brasil...');

  // 1. Obter sitemap com URLs de produtos
  const sitemapUrl = 'https://data-exporter.belezanaweb.com.br/sitemap/46/produto.xml';
  const res = await fetch(sitemapUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });

  if (!res.ok) {
    throw new Error(`Falha ao obter sitemap da Eudora: ${res.status}`);
  }

  const xml = await res.text();
  const rawLocs = xml.match(/<loc>(https:\/\/www\.eudora\.com\.br\/produto\/.*?)<\/loc>/g) || [];
  const urls = rawLocs.map((l) => l.replace(/<\/?loc>/g, '').trim());

  console.log(`📦 Total de produtos Eudora identificados no feed: ${urls.length}`);

  const targets = urls.slice(0, limit);
  const products = [];
  const seenCodes = new Set();

  const batchSize = 5;
  for (let i = 0; i < targets.length; i += batchSize) {
    const chunk = targets.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const pRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (!pRes.ok) return;

          const html = await pRes.text();

          // Extrair via Meta Tags / OpenGraph de alta fidelidade
          let code = '';
          const metaCodeMatch = html.match(/<meta property=["']product:retailer_item_id["'] content=["']([^"']+)["']/i);
          if (metaCodeMatch) {
            code = metaCodeMatch[1].trim().replace(/^E/i, ''); // Remove prefixo 'E' de Eudora se for alfanumérico
          }

          let name = '';
          const metaTitleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i);
          if (metaTitleMatch) {
            name = unescapeHtml(metaTitleMatch[1].replace(/\|\s*(?:Perfumaria|Maquiagem|Cabelos)?\s*Eudora/gi, ''));
          }

          let price = 0;
          const metaPriceMatch = html.match(/<meta property=["']product:price:amount["'] content=["']([^"']+)["']/i);
          if (metaPriceMatch) {
            price = parseFloat(metaPriceMatch[1]) || 0;
          }

          let image = '';
          const metaImageMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
          if (metaImageMatch) {
            image = metaImageMatch[1].trim();
          }

          // Fallback para Schema.org se faltou algo
          if (!code || !name || price === 0) {
            const schemaMatch = html.match(/<script.*?>([\s\S]*?)<\/script>/gi);
            if (schemaMatch) {
              for (const s of schemaMatch) {
                if (s.includes('"@type": "Product"') || s.includes('"@type":"Product"')) {
                  try {
                    const cleanJson = s.replace(/<script.*?>|<\/script>/gi, '');
                    const sData = JSON.parse(cleanJson);
                    if (!code && sData.sku) code = String(sData.sku).replace(/^E/i, '');
                    if (!name && sData.name) name = sData.name;
                    if (price === 0 && sData.offers?.price) price = parseFloat(sData.offers.price);
                    if (!image && sData.image) image = Array.isArray(sData.image) ? sData.image[0] : sData.image;
                  } catch {}
                }
              }
            }
          }

          if (!code || seenCodes.has(code) || !name) return;
          seenCodes.add(code);

          const defaultCost = Math.round(price * 0.70 * 100) / 100; // 30% padrão consultora Eudora

          // Inferir categoria básica a partir da URL
          let category = 'Cosméticos Eudora';
          if (url.includes('shampoo') || url.includes('cabelo') || url.includes('siage')) category = 'Cabelos';
          else if (url.includes('colonia') || url.includes('perfume') || url.includes('eau-de-parfum')) category = 'Perfumaria';
          else if (url.includes('batom') || url.includes('base') || url.includes('iluminador') || url.includes('glam')) category = 'Maquiagem';
          else if (url.includes('hidratante') || url.includes('corpo')) category = 'Corpo e Banho';

          products.push({
            code: code,
            name: name,
            brand: 'Eudora',
            line: 'Eudora',
            category: category,
            size_or_variant: '',
            unit: 'UN',
            sale_price: 0,
            cost_price: defaultCost,
            retail_reference_price: price,
            image_url: image,
            url: url,
          });
        } catch (err) {
          // ignore error
        }
      })
    );

    process.stdout.write(`\r⏳ Eudora: ${Math.min(i + batchSize, targets.length)} / ${targets.length} analisados...`);
    await sleep(250);
  }

  console.log(`\n🎉 Extração Eudora concluída! ${products.length} produtos válidos obtidos.`);

  // Salvar arquivos
  const outDir = path.resolve('public', 'templates');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'catalogo_eudora_modelo.json'),
    JSON.stringify(products, null, 2),
    'utf8'
  );

  const csvHeaders = 'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL\r\n';
  const csvRows = products
    .map((p) => {
      const saleStr = p.sale_price > 0 ? p.sale_price.toFixed(2).replace('.', ',') : '';
      const costStr = p.cost_price.toFixed(2).replace('.', ',');
      const sugStr = p.retail_reference_price > 0 ? p.retail_reference_price.toFixed(2).replace('.', ',') : '';
      const cleanName = p.name.replace(/;/g, ' - ');
      const cleanCat = p.category.replace(/;/g, ' ');
      return `${p.code};${cleanName};Eudora;;;${p.unit};${cleanCat};0;${saleStr};${costStr};${sugStr};${p.image_url}`;
    })
    .join('\r\n');

  fs.writeFileSync(path.join(outDir, 'catalogo_eudora_modelo.csv'), '\uFEFF' + csvHeaders + csvRows, 'utf8');
  console.log('📁 Arquivos catalogo_eudora_modelo.json e .csv gerados com sucesso!');
  return products;
}

if (process.argv[1]?.endsWith('scrape_eudora.mjs')) {
  scrapeEudora(250).catch(console.error);
}

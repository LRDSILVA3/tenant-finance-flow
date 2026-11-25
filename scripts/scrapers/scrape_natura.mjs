/**
 * Scraper do Catálogo Oficial Natura Brasil
 * Gera modelos CSV e JSON compatíveis com o Previna
 */

import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeNatura(limit = 250) {
  console.log('🌸 Iniciando extração do catálogo oficial da Natura Brasil...');

  // 1. Obter sitemap com URLs de produtos
  const sitemapUrl = 'https://www.natura.com.br/on/demandware.store/Sites-NatBrazil-Site/default/Feed-SiteMap';
  const res = await fetch(sitemapUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });

  if (!res.ok) {
    throw new Error(`Falha ao obter sitemap da Natura: ${res.status}`);
  }

  const xml = await res.text();
  const rawLocs = xml.match(/<loc>(https:\/\/www\.natura\.com\.br\/p\/.*?)<\/loc>/g) || [];
  const urls = rawLocs
    .map((l) => l.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.includes('NATBRA-'));

  console.log(`📦 Total de produtos Natura identificados no feed: ${urls.length}`);

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
          const scriptRegex = /<script.*?>([\s\S]*?)<\/script>/gi;
          let match;
          while ((match = scriptRegex.exec(html)) !== null) {
            const content = match[1].trim();
            if (content.includes('"@type":"Product"') || content.includes('"@type": "Product"')) {
              try {
                const data = JSON.parse(content);
                const rawSku = data.sku || '';
                const cleanCode = String(rawSku).replace(/^NATBRA-/i, '').trim();

                if (!cleanCode || seenCodes.has(cleanCode)) return;
                seenCodes.add(cleanCode);

                const name = String(data.name || '').replace(/[\r\n\t]+/g, ' ').trim();
                const price = Number(data.offers?.price || data.offers?.lowPrice || data.offers?.highPrice || 0);
                const defaultCost = Math.round(price * 0.70 * 100) / 100; // 30% padrão Natura
                const image = Array.isArray(data.image) ? data.image[0] : data.image || '';
                const brand = data.brand?.name || 'Natura';
                const category = data.category || 'Perfumaria e Cosméticos';

                products.push({
                  code: cleanCode,
                  name: name,
                  brand: 'Natura',
                  line: brand,
                  category: category,
                  size_or_variant: '',
                  unit: 'UN',
                  sale_price: 0,
                  cost_price: defaultCost,
                  retail_reference_price: price,
                  image_url: image,
                  url: url,
                });
                return;
              } catch {}
            }
          }
        } catch (err) {
          // ignore single item failure
        }
      })
    );

    process.stdout.write(`\r⏳ Natura: ${Math.min(i + batchSize, targets.length)} / ${targets.length} analisados...`);
    await sleep(250);
  }

  console.log(`\n🎉 Extração Natura concluída! ${products.length} produtos válidos obtidos.`);

  // Salvar arquivos
  const outDir = path.resolve('public', 'templates');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'catalogo_natura_modelo.json'),
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
      return `${p.code};${cleanName};Natura;;;${p.unit};${cleanCat};0;${saleStr};${costStr};${sugStr};${p.image_url}`;
    })
    .join('\r\n');

  fs.writeFileSync(path.join(outDir, 'catalogo_natura_modelo.csv'), '\uFEFF' + csvHeaders + csvRows, 'utf8');
  console.log('📁 Arquivos catalogo_natura_modelo.json e .csv gerados com sucesso!');
  return products;
}

if (process.argv[1]?.endsWith('scrape_natura.mjs')) {
  scrapeNatura(250).catch(console.error);
}

/**
 * Scraper do Catálogo Oficial WePink Brasil (VTEX API)
 * Gera modelos CSV e JSON compatíveis com o Previna
 */

import fs from 'node:path';
import fsPromises from 'node:fs';
import path from 'node:path';

export async function scrapeWePink(totalLimit = 200) {
  console.log('💖 Iniciando extração do catálogo oficial da WePink Brasil...');

  const products = [];
  const seenCodes = new Set();
  const pageSize = 50;
  let from = 0;

  while (products.length < totalLimit) {
    const to = from + pageSize - 1;
    const url = `https://www.wepink.com.br/api/catalog_system/pub/products/search?_from=${from}&_to=${to}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`Aviso: VTEX retornou status ${res.status}`);
      break;
    }

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    for (const item of items) {
      const firstSku = item.items?.[0];
      const code = String(item.productReference || item.productReferenceCode || firstSku?.itemId || item.productId).trim();
      if (!code || seenCodes.has(code)) continue;
      seenCodes.add(code);

      const name = String(item.productName || item.productTitle || '').replace(/[\r\n\t]+/g, ' ').trim();
      const rawPrice = Number(firstSku?.sellers?.[0]?.commertialOffer?.Price || firstSku?.sellers?.[0]?.commertialOffer?.ListPrice || 0);
      const defaultCost = Math.round(rawPrice * 0.70 * 100) / 100; // 30% margem revendedor
      const image = firstSku?.images?.[0]?.imageUrl || '';
      const category = item.categories?.[0]?.replace(/^\/|\/$/g, '').split('/')[0] || 'Cosméticos & Perfumaria';

      products.push({
        code: code,
        name: name,
        brand: 'WePink',
        line: item.brand || 'WePink',
        category: category,
        size_or_variant: '',
        unit: 'UN',
        sale_price: 0,
        cost_price: defaultCost,
        retail_reference_price: rawPrice,
        image_url: image,
        url: item.link || `https://www.wepink.com.br/${item.linkText}/p`,
      });

      if (products.length >= totalLimit) break;
    }

    from += pageSize;
  }

  console.log(`\n🎉 Extração WePink concluída! ${products.length} produtos válidos obtidos.`);

  // Salvar arquivos
  const outDir = path.resolve('public', 'templates');
  if (!fsPromises.existsSync(outDir)) fsPromises.mkdirSync(outDir, { recursive: true });

  fsPromises.writeFileSync(
    path.join(outDir, 'catalogo_wepink_modelo.json'),
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
      return `${p.code};${cleanName};WePink;;;${p.unit};${cleanCat};0;${saleStr};${costStr};${sugStr};${p.image_url}`;
    })
    .join('\r\n');

  fsPromises.writeFileSync(path.join(outDir, 'catalogo_wepink_modelo.csv'), '\uFEFF' + csvHeaders + csvRows, 'utf8');
  console.log('📁 Arquivos catalogo_wepink_modelo.json e .csv gerados com sucesso!');
  return products;
}

if (process.argv[1]?.endsWith('scrape_wepink.mjs')) {
  scrapeWePink(200).catch(console.error);
}

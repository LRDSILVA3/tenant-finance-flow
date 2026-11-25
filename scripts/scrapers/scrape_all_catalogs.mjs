/**
 * Executa os scrapers de todos os catálogos oficiais (Farmasi, Natura, Avon, Eudora)
 * Gera os modelos CSV e JSON em public/templates/
 */

import { scrapeNatura } from './scrape_natura.mjs';
import { scrapeAvon } from './scrape_avon.mjs';
import { scrapeEudora } from './scrape_eudora.mjs';

async function main() {
  console.log('🚀 Iniciando atualização de todos os catálogos multimarcas...\n');

  try {
    console.log('1/3: Natura Brasil...');
    await scrapeNatura(150);
  } catch (err) {
    console.error('❌ Erro no catálogo Natura:', err.message);
  }

  try {
    console.log('\n2/3: Avon Brasil...');
    await scrapeAvon(150);
  } catch (err) {
    console.error('❌ Erro no catálogo Avon:', err.message);
  }

  try {
    console.log('\n3/3: Eudora Brasil...');
    await scrapeEudora(150);
  } catch (err) {
    console.error('❌ Erro no catálogo Eudora:', err.message);
  }

  console.log('\n✨ Todos os catálogos foram processados com sucesso!');
}

main().catch(console.error);

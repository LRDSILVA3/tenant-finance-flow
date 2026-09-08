import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));
console.log('Using browser at:', executablePath);

const outputDir = path.resolve('docs/prints');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper to click by text
  const clickElementWithText = async (text, selector = 'button, [role="menuitem"], a, span, div') => {
    return await page.evaluate(({ text, selector }) => {
      const elements = Array.from(document.querySelectorAll(selector));
      const target = elements.find(el => el.textContent && el.textContent.trim().toLowerCase() === text.toLowerCase()) 
        || elements.find(el => el.textContent && el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.click();
        return true;
      }
      return false;
    }, { text, selector });
  };

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.screenshot({ path: path.join(outputDir, '01_landing_page.png') });
  console.log('✓ 01_landing_page.png');

  console.log('2. Capturing Login Page...');
  await page.goto('http://localhost:8081/auth', { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.screenshot({ path: path.join(outputDir, '02_login_auth.png') });
  console.log('✓ 02_login_auth.png');

  console.log('Logging in with demo user...');
  const emailInput = await page.$('input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');
  if (emailInput && passwordInput) {
    await emailInput.type('demo@previna.com.br', { delay: 30 });
    await passwordInput.type('previna123', { delay: 30 });
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
  }
  await sleep(4000);

  // Close tour if present
  await page.evaluate(() => {
    const closeBtns = Array.from(document.querySelectorAll('button'));
    const skipBtn = closeBtns.find(b => b.textContent && (b.textContent.includes('Pular') || b.textContent.includes('Fechar')));
    if (skipBtn) skipBtn.click();
  });
  await sleep(1000);

  console.log('3. Capturing Dashboard Principal...');
  await page.screenshot({ path: path.join(outputDir, '03_dashboard_principal.png') });
  console.log('✓ 03_dashboard_principal.png');

  // --- FINANCEIRO ---
  console.log('4. Capturing Lançamentos (Financeiro)...');
  await page.click('[data-tour="nav-financeiro"]').catch(() => clickElementWithText('Financeiro'));
  await sleep(500);
  await clickElementWithText('Lançamentos', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '04_lancamentos_financeiros.png') });
  console.log('✓ 04_lancamentos_financeiros.png');

  console.log('5. Capturing Modal Novo Lançamento...');
  // Click "+ Nova Receita" or "Novo Lançamento"
  await clickElementWithText('Nova Receita', 'button').catch(() => clickElementWithText('Novo Lançamento', 'button'));
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '05_modal_novo_lancamento.png') });
  console.log('✓ 05_modal_novo_lancamento.png');
  // Close modal (Escape or click outside/close)
  await page.keyboard.press('Escape');
  await sleep(1000);

  console.log('6. Capturing Contas a Receber...');
  await page.click('[data-tour="nav-financeiro"]').catch(() => clickElementWithText('Financeiro'));
  await sleep(500);
  await clickElementWithText('Contas a Receber', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '06_contas_a_receber.png') });
  console.log('✓ 06_contas_a_receber.png');

  console.log('7. Capturing Contas a Pagar...');
  await page.click('[data-tour="nav-financeiro"]').catch(() => clickElementWithText('Financeiro'));
  await sleep(500);
  await clickElementWithText('Contas a Pagar', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '07_contas_a_pagar.png') });
  console.log('✓ 07_contas_a_pagar.png');

  // --- INCLUIR (VENDAS & PDV) ---
  console.log('8. Capturing Modo Loja (PDV Touch)...');
  await page.click('[data-tour="nav-incluir"]').catch(() => clickElementWithText('Incluir'));
  await sleep(500);
  await clickElementWithText('Modo Loja', '[role="menuitem"], button, div');
  await sleep(3000);
  await page.screenshot({ path: path.join(outputDir, '08_modo_loja_pdv.png') });
  console.log('✓ 08_modo_loja_pdv.png');

  console.log('9. Capturing Pedidos de Venda...');
  await page.click('[data-tour="nav-incluir"]').catch(() => clickElementWithText('Incluir'));
  await sleep(500);
  await clickElementWithText('Pedido de Venda', '[role="menuitem"], button, div');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '09_pedidos_de_venda.png') });
  console.log('✓ 09_pedidos_de_venda.png');

  console.log('10. Capturing Ordens de Serviço...');
  await page.click('[data-tour="nav-incluir"]').catch(() => clickElementWithText('Incluir'));
  await sleep(500);
  await clickElementWithText('Ordem de Serviço', '[role="menuitem"], button, div');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '10_ordens_de_servico.png') });
  console.log('✓ 10_ordens_de_servico.png');

  // --- CADASTROS ---
  console.log('11. Capturing Clientes...');
  await page.click('[data-tour="nav-cadastros"]').catch(() => clickElementWithText('Cadastros'));
  await sleep(500);
  await clickElementWithText('Clientes', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '11_clientes.png') });
  console.log('✓ 11_clientes.png');

  console.log('12. Capturing Fornecedores...');
  await page.click('[data-tour="nav-cadastros"]').catch(() => clickElementWithText('Cadastros'));
  await sleep(500);
  await clickElementWithText('Fornecedores', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '12_fornecedores.png') });
  console.log('✓ 12_fornecedores.png');

  console.log('13. Capturing Agenda de Serviços...');
  await page.click('[data-tour="nav-cadastros"]').catch(() => clickElementWithText('Cadastros'));
  await sleep(500);
  await clickElementWithText('Agenda', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '13_agenda_servicos.png') });
  console.log('✓ 13_agenda_servicos.png');

  console.log('14. Capturing Gestão de Escalas de Trabalho (Agenda)...');
  await clickElementWithText('Escalas & Horários', 'button, [role="tab"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(outputDir, '14_agenda_gestao_escalas.png') });
  console.log('✓ 14_agenda_gestao_escalas.png');

  console.log('15. Capturing Estoque & Inventário...');
  await page.click('[data-tour="nav-cadastros"]').catch(() => clickElementWithText('Cadastros'));
  await sleep(500);
  await clickElementWithText('Estoque', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '15_estoque_inventario.png') });
  console.log('✓ 15_estoque_inventario.png');

  // --- RELATÓRIOS ---
  console.log('16. Capturing Relatório DRE Simplificado...');
  await page.click('[data-tour="nav-relatorios"]').catch(() => clickElementWithText('Relatórios'));
  await sleep(500);
  await clickElementWithText('DRE Simplificado', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '16_relatorios_dre.png') });
  console.log('✓ 16_relatorios_dre.png');

  console.log('17. Capturing Relatório de Estoque e Inventário (Kardex/Curva ABC)...');
  await page.click('[data-tour="nav-relatorios"]').catch(() => clickElementWithText('Relatórios'));
  await sleep(500);
  await clickElementWithText('Estoque e Inventário', '[role="menuitem"], button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '17_relatorios_inventario_kardex.png') });
  console.log('✓ 17_relatorios_inventario_kardex.png');

  console.log('18. Capturing Relatório de Comissões...');
  await page.click('[data-tour="nav-relatorios"]').catch(() => clickElementWithText('Relatórios'));
  await sleep(500);
  const commFound = await clickElementWithText('Comissões', '[role="menuitem"], button');
  if (commFound) {
    await sleep(2500);
    await page.screenshot({ path: path.join(outputDir, '18_relatorios_comissoes.png') });
    console.log('✓ 18_relatorios_comissoes.png');
  } else {
    // If not visible, capture Distribuição
    await clickElementWithText('Distribuição', '[role="menuitem"], button');
    await sleep(2500);
    await page.screenshot({ path: path.join(outputDir, '18_relatorios_distribuicao.png') });
    console.log('✓ 18_relatorios_distribuicao.png');
  }

  // --- NOTIFICAÇÕES ---
  console.log('19. Capturing Central de Notificações...');
  await clickElementWithText('Notificações', 'button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '19_central_notificacoes.png') });
  console.log('✓ 19_central_notificacoes.png');

  // --- CONFIGURAÇÕES ---
  console.log('20. Capturing Configurações da Empresa...');
  await clickElementWithText('Configurações', 'button');
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '20_configuracoes_empresa.png') });
  console.log('✓ 20_configuracoes_empresa.png');

  console.log('21. Capturing Formas de Pagamento Personalizadas...');
  await clickElementWithText('Formas de Pagamento', 'button, [role="tab"]');
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '21_configuracoes_formas_pagamento.png') });
  console.log('✓ 21_configuracoes_formas_pagamento.png');

  console.log('22. Capturing Painel de Faturamento & Assinatura...');
  await clickElementWithText('Faturamento & Assinatura', 'button, [role="tab"]');
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '22_configuracoes_assinatura.png') });
  console.log('✓ 22_configuracoes_assinatura.png');

  // --- MOBILE EMULATION (375x812 - iPhone X/12) ---
  console.log('23. Capturing Mobile Smartphone View (PDV Touch & Menu)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  // Navigate to PDV
  await page.click('button span:has-text("PDV")').catch(async () => {
    await clickElementWithText('PDV', 'button, span');
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '23_mobile_pdv_responsivo.png') });
  console.log('✓ 23_mobile_pdv_responsivo.png');

  console.log('24. Capturing Mobile Navigation Menu Sheet...');
  await clickElementWithText('Menu', 'button, span');
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '24_mobile_menu_navegacao.png') });
  console.log('✓ 24_mobile_menu_navegacao.png');

  await browser.close();
  console.log('🎉 All screenshots captured successfully in docs/prints/!');
}

run().catch(err => {
  console.error('Error during capture process:', err);
  process.exit(1);
});

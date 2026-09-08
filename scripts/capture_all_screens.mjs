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

  // Helper function to switch view cleanly via window.__setView
  const setView = async (view, reportTab) => {
    await page.evaluate(({ view, reportTab }) => {
      if (window.__setView) {
        window.__setView(view, reportTab);
      }
    }, { view, reportTab });
    await sleep(2000);
  };

  console.log('3. Capturing Dashboard Principal...');
  await setView('dashboard');
  await page.screenshot({ path: path.join(outputDir, '03_dashboard_principal.png') });
  console.log('✓ 03_dashboard_principal.png');

  console.log('4. Capturing Lançamentos (Financeiro)...');
  await setView('transactions');
  await page.screenshot({ path: path.join(outputDir, '04_lancamentos_financeiros.png') });
  console.log('✓ 04_lancamentos_financeiros.png');

  console.log('5. Capturing Modal Novo Lançamento...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.textContent && (b.textContent.includes('Nova Receita') || b.textContent.includes('Novo Lançamento')));
    if (target) target.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '05_modal_novo_lancamento.png') });
  console.log('✓ 05_modal_novo_lancamento.png');
  await page.keyboard.press('Escape');
  await sleep(800);

  console.log('6. Capturing Contas a Receber...');
  await setView('receivables');
  await page.screenshot({ path: path.join(outputDir, '06_contas_a_receber.png') });
  console.log('✓ 06_contas_a_receber.png');

  console.log('7. Capturing Contas a Pagar...');
  await setView('payables');
  await page.screenshot({ path: path.join(outputDir, '07_contas_a_pagar.png') });
  console.log('✓ 07_contas_a_pagar.png');

  console.log('8. Capturing Modo Loja (PDV Touch)...');
  await setView('store_pos');
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '08_modo_loja_pdv.png') });
  console.log('✓ 08_modo_loja_pdv.png');

  console.log('9. Capturing Pedidos de Venda...');
  await setView('orders');
  await page.screenshot({ path: path.join(outputDir, '09_pedidos_de_venda.png') });
  console.log('✓ 09_pedidos_de_venda.png');

  console.log('10. Capturing Ordens de Serviço...');
  await setView('service_orders');
  await page.screenshot({ path: path.join(outputDir, '10_ordens_de_servico.png') });
  console.log('✓ 10_ordens_de_servico.png');

  console.log('11. Capturing Clientes...');
  await setView('customers');
  await page.screenshot({ path: path.join(outputDir, '11_clientes.png') });
  console.log('✓ 11_clientes.png');

  console.log('12. Capturing Fornecedores...');
  await setView('suppliers');
  await page.screenshot({ path: path.join(outputDir, '12_fornecedores.png') });
  console.log('✓ 12_fornecedores.png');

  console.log('13. Capturing Agenda de Serviços (Grade Diária)...');
  await setView('schedule');
  await page.screenshot({ path: path.join(outputDir, '13_agenda_servicos.png') });
  console.log('✓ 13_agenda_servicos.png');

  console.log('14. Capturing Gestão de Escalas de Trabalho...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const shiftTab = tabs.find(t => t.textContent && t.textContent.includes('Escalas & Horários'));
    if (shiftTab) shiftTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '14_agenda_gestao_escalas.png') });
  console.log('✓ 14_agenda_gestao_escalas.png');

  console.log('15. Capturing Estoque & Inventário...');
  await setView('inventory');
  await page.screenshot({ path: path.join(outputDir, '15_estoque_inventario.png') });
  console.log('✓ 15_estoque_inventario.png');

  // --- TODOS OS RELATÓRIOS ---
  console.log('16. Capturing Relatório DRE Simplificado...');
  await setView('reports', 'dre');
  await page.screenshot({ path: path.join(outputDir, '16_relatorios_dre.png') });
  console.log('✓ 16_relatorios_dre.png');

  console.log('17. Capturing Relatório de Comissões...');
  await setView('reports', 'commissions');
  await page.screenshot({ path: path.join(outputDir, '17_relatorios_comissoes.png') });
  console.log('✓ 17_relatorios_comissoes.png');

  console.log('18. Capturing Relatório de Distribuição de Despesas...');
  await setView('reports', 'distribution');
  await page.screenshot({ path: path.join(outputDir, '18_relatorios_distribuicao.png') });
  console.log('✓ 18_relatorios_distribuicao.png');

  console.log('19. Capturing Relatório de Fluxo Projetado...');
  await setView('reports', 'projection');
  await page.screenshot({ path: path.join(outputDir, '19_relatorios_fluxo_projetado.png') });
  console.log('✓ 19_relatorios_fluxo_projetado.png');

  console.log('20. Capturing Relatório de Ponto de Equilíbrio...');
  await setView('reports', 'breakeven');
  await page.screenshot({ path: path.join(outputDir, '20_relatorios_ponto_equilibrio.png') });
  console.log('✓ 20_relatorios_ponto_equilibrio.png');

  console.log('21. Capturing Relatório de Contas Pagar / Receber...');
  await setView('reports', 'payables');
  await page.screenshot({ path: path.join(outputDir, '21_relatorios_contas_pagar_receber.png') });
  console.log('✓ 21_relatorios_contas_pagar_receber.png');

  console.log('22. Capturing Relatório de Análise de Margem...');
  await setView('reports', 'margins');
  await page.screenshot({ path: path.join(outputDir, '22_relatorios_analise_margem.png') });
  console.log('✓ 22_relatorios_analise_margem.png');

  console.log('23. Capturing Relatório de Estoque e Inventário (Kardex / Curva ABC)...');
  await setView('reports', 'inventory');
  await page.screenshot({ path: path.join(outputDir, '23_relatorios_inventario_kardex.png') });
  console.log('✓ 23_relatorios_inventario_kardex.png');

  // --- OUTRAS TELAS ---
  console.log('24. Capturing Central de Notificações...');
  await setView('notifications');
  await page.screenshot({ path: path.join(outputDir, '24_central_notificacoes.png') });
  console.log('✓ 24_central_notificacoes.png');

  console.log('25. Capturing Configurações da Empresa...');
  await setView('settings');
  await page.screenshot({ path: path.join(outputDir, '25_configuracoes_empresa.png') });
  console.log('✓ 25_configuracoes_empresa.png');

  console.log('26. Capturing Formas de Pagamento Personalizadas...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const paymentTab = tabs.find(t => t.textContent && t.textContent.includes('Formas de Pagamento'));
    if (paymentTab) paymentTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '26_configuracoes_formas_pagamento.png') });
  console.log('✓ 26_configuracoes_formas_pagamento.png');

  console.log('27. Capturing Faturamento & Assinatura...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const subTab = tabs.find(t => t.textContent && t.textContent.includes('Faturamento & Assinatura'));
    if (subTab) subTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '27_configuracoes_assinatura.png') });
  console.log('✓ 27_configuracoes_assinatura.png');

  // --- RESPONSIVIDADE MOBILE ---
  console.log('28. Capturing Mobile Smartphone View (PDV Touch)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await setView('store_pos');
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '28_mobile_pdv_responsivo.png') });
  console.log('✓ 28_mobile_pdv_responsivo.png');

  console.log('29. Capturing Mobile Navigation Menu Sheet...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const menuBtn = buttons.find(b => b.textContent && b.textContent.includes('Menu'));
    if (menuBtn) menuBtn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(outputDir, '29_mobile_menu_navegacao.png') });
  console.log('✓ 29_mobile_menu_navegacao.png');

  await browser.close();
  console.log('🎉 All 29 clean full-screen screenshots captured successfully in docs/prints/!');
}

run().catch(err => {
  console.error('Error during capture process:', err);
  process.exit(1);
});

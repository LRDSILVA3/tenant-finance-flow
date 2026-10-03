import puppeteer from 'puppeteer-core';

const executablePath = 'C:\\Users\\User\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

async function testStorePosAndReceipt() {
  console.log('🚀 Testing StorePos and Order Receipt Modal in Chromium...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // 1. Login
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'demo@previna.com.br');
  await page.type('input[type="password"]', 'previna123');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Abrir Modo Loja (StorePos)
  console.log('2. Opening Modo Loja (PDV Touch)...');
  await page.evaluate(() => {
    if (window.__setView) window.__setView('store_pos');
  });

  await new Promise(r => setTimeout(r, 3000));

  const storePosScreenshot = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\66859d31-1b26-4117-934c-bbefea1818bc\\e2e_store_pos.png';
  await page.screenshot({ path: storePosScreenshot, fullPage: true });
  console.log('📸 StorePos screenshot saved to:', storePosScreenshot);

  // 3. Voltar para Pedidos e abrir Comprovante
  console.log('3. Returning to Pedidos and opening Receipt Modal...');
  await page.evaluate(() => {
    if (window.__setView) window.__setView('orders');
  });
  await new Promise(r => setTimeout(r, 2000));

  // Vai para Histórico
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
    const histTab = tabs.find(t => t.textContent && t.textContent.includes('Histórico'));
    if (histTab) histTab.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Clica no primeiro botão "Comprovante"
  console.log('4. Clicking Comprovante on first order...');
  await page.evaluate(() => {
    const compBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Comprovante'));
    if (compBtns.length > 0) compBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const receiptModalScreenshot = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\66859d31-1b26-4117-934c-bbefea1818bc\\e2e_receipt_modal.png';
  await page.screenshot({ path: receiptModalScreenshot, fullPage: true });
  console.log('📸 Receipt modal screenshot saved to:', receiptModalScreenshot);

  await browser.close();
  console.log('✅ StorePos & Receipt verification complete!');
}

testStorePosAndReceipt().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[PAGE LOG]`, msg.text()));
  page.on('pageerror', err => console.error(`[PAGE ERROR]`, err));

  console.log('1. Go to login...');
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle2' });
  
  // Fill login
  await page.type('input[type="email"]', 'admin@newfeel.com.br');
  await page.type('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  console.log('2. Waiting for /app...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL:', page.url());

  console.log('3. Clicking logout...');
  // Open user dropdown menu and click logout
  // Or trigger signOut
  await page.evaluate(async () => {
    // Find logout button or trigger signOut
    const btns = Array.from(document.querySelectorAll('button'));
    const userBtn = btns.find(b => b.querySelector('svg.lucide-user') || b.textContent.includes('Admin') || b.textContent.includes('admin@newfeel.com.br'));
    if (userBtn) {
      userBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const logoutItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(el => el.textContent.includes('Sair'));
      if (logoutItem) logoutItem.click();
    }
  });

  await new Promise(r => setTimeout(r, 3000));
  console.log('Post-logout URL:', page.url());

  await page.screenshot({ path: 'scratch/after_logout.png', fullPage: true });
  console.log('Saved scratch/after_logout.png');

  await browser.close();
}

run().catch(console.error);

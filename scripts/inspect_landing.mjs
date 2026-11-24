import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

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
  
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    consoleMessages.push({ type: 'pageerror', text: err.toString() });
  });

  console.log('Navigating to http://localhost:8080/...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'scratch/landing_first_load.png', fullPage: true });
  console.log('Saved screenshot to scratch/landing_first_load.png');

  console.log('\n--- Console Logs ---');
  consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

  const rootHtml = await page.evaluate(() => {
    const el = document.getElementById('root');
    return {
      className: document.documentElement.className,
      bodyClass: document.body.className,
      hasRootChildren: el ? el.children.length : 0,
      rootInnerHtmlPreview: el ? el.innerHTML.slice(0, 300) : 'null'
    };
  });
  console.log('\n--- DOM Inspection ---', JSON.stringify(rootHtml, null, 2));

  await browser.close();
}

run().catch(console.error);

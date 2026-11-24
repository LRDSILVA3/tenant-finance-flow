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
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Set theme to dark in localStorage BEFORE page loads
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('theme', 'dark');
  });

  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: 'scratch/landing_forced_dark.png', fullPage: true });
  console.log('Saved scratch/landing_forced_dark.png');

  const info = await page.evaluate(() => {
    const header = document.querySelector('header');
    const hero = document.querySelector('h1');
    return {
      htmlClass: document.documentElement.className,
      headerBg: window.getComputedStyle(header).backgroundColor,
      headerColor: window.getComputedStyle(header).color,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      bodyColor: window.getComputedStyle(document.body).color
    };
  });
  console.log('Forced dark info:', info);

  await browser.close();
}

run().catch(console.error);

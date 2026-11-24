import puppeteer from 'puppeteer-core';

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
  await page.goto('https://gestaoprevina.com.br/', { waitUntil: 'networkidle2' });

  const analysis = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = document.querySelector('h1');
    const precos = document.getElementById('precos');
    const plans = precos ? Array.from(precos.querySelectorAll('.bg-card')).map(p => ({
      title: p.querySelector('h3')?.innerText,
      price: p.querySelector('.text-4xl')?.innerText,
      featuresCount: p.querySelectorAll('li').length,
      box: p.getBoundingClientRect()
    })) : [];

    const computedH1 = h1 ? window.getComputedStyle(h1) : null;
    const computedHeader = header ? window.getComputedStyle(header) : null;

    return {
      h1Text: h1?.innerText,
      h1FontSize: computedH1?.fontSize,
      h1FontFamily: computedH1?.fontFamily,
      headerHeight: computedHeader?.height,
      plans,
      totalImages: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height
      }))
    };
  });

  console.log(JSON.stringify(analysis, null, 2));
  await browser.close();
}

import fs from 'fs';
run().catch(console.error);

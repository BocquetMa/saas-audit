import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fetch from 'node-fetch';
import axeSource from 'axe-core'; // 👈 pas de import *
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

puppeteer.use(StealthPlugin());

export async function accessibilityAudit(url) {
  const browser = await puppeteer.launch({
    headless: 'new', // 👈 corrige l’avertissement
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Injecter axe-core correctement
  await page.evaluate((source) => {
    const script = document.createElement('script');
    script.innerHTML = source;
    document.head.appendChild(script);
  }, axeSource.source);

  // Vérifier que axe est bien chargé
  const isAxeLoaded = await page.evaluate(() => typeof window.axe !== 'undefined');
  if (!isAxeLoaded) throw new Error('axe-core failed to load in page');

  // Exécuter l’audit axe
  const axeResults = await page.evaluate(async () => {
    return await window.axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
  });

  // Vérifications manuelles supplémentaires
  const manualChecks = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => h.tagName);
    const main = !!document.querySelector('main');
    const nav = !!document.querySelector('nav');
    const footer = !!document.querySelector('footer');

    const missingAlt = imgs.filter(img => !img.alt || img.alt.trim() === '').length;
    const unlabeledInputs = inputs.filter(i => !i.labels?.length && !i.getAttribute('aria-label')).length;

    // Vérification du focus visible
    const interactiveEls = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
    const focusVisible = interactiveEls.some(el => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
    });

    // Vérification roles ARIA essentiels
    const ariaRoles = Array.from(document.querySelectorAll('[role]')).map(el => el.getAttribute('role'));
    const hasLandmarks = ['banner', 'main', 'navigation', 'contentinfo'].some(role => ariaRoles.includes(role));

    return {
      missingAlt,
      unlabeledInputs,
      focusVisible,
      headings,
      hasMain: main,
      hasNav: nav,
      hasFooter: footer,
      hasAriaLandmarks: hasLandmarks
    };
  });

  await browser.close();

  // Audit Lighthouse (score accessibilité)
  const chrome = await launch({ chromeFlags: ['--headless'] });
  const lhResult = await lighthouse(url, {
    port: chrome.port,
    onlyCategories: ['accessibility']
  });
  await chrome.kill();

  const lighthouseScore = Math.round(lhResult.lhr.categories.accessibility.score * 100);

  const summary = {
    totalViolations: axeResults.violations.length,
    critical: axeResults.violations.filter(v => v.impact === 'critical').length,
    serious: axeResults.violations.filter(v => v.impact === 'serious').length,
    moderate: axeResults.violations.filter(v => v.impact === 'moderate').length,
    minor: axeResults.violations.filter(v => v.impact === 'minor').length
  };

  return {
    url,
    summary,
    lighthouseScore,
    axeFindings: axeResults.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length
    })),
    manualChecks
  };
}
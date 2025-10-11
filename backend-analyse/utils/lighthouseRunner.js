import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { URL } from 'url';

export const run = async (url, formFactor = 'desktop') => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const { port } = new URL(browser.wsEndpoint());
    const lhResult = await lighthouse(url, {
        port,
        output: 'json',
        logLevel: 'info',
        emulatedFormFactor: formFactor,
    });

    await browser.close();

    const lhr = lhResult.lhr;

    // Extraire les principaux timings
    const ttfb = lhr.audits['server-response-time']?.numericValue || 0;
    const fcp = lhr.audits['first-contentful-paint']?.numericValue || 0;
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue || 0;
    const tti = lhr.audits['interactive']?.numericValue || 0;

    return { ttfb, fcp, lcp, tti, audits: lhr.audits };
};
import puppeteer from 'puppeteer';

export const getPageSizeAndRequests = async (url) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // User-Agent réaliste pour éviter les 403
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1366, height: 768 });

    await page.goto(url, { waitUntil: 'networkidle2' });

    const metrics = await page.metrics();

    // Ici tu peux récupérer requests et taille totale depuis performance entries
    const requests = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => ({
            name: r.name,
            transferSize: r.transferSize,
            encodedBodySize: r.encodedBodySize,
        }));
    });

    await browser.close();

    return { metrics, requests };
};

export const checkCompression = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    const encoding = response.headers()['content-encoding'] || 'none';

    await browser.close();
    return { contentEncoding: encoding };
};

export const checkCaching = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    const cacheControl = response.headers()['cache-control'] || 'none';
    const xCache = response.headers()['x-cache'] || 'none';

    await browser.close();
    return { cacheControl, xCache };
};
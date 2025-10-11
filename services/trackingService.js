import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

export async function analyzeTracking(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Timeout un peu plus long pour sites lourds
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (err) {
        console.error("Erreur lors du chargement du site:", err.message);
    }

    // Analyse des scripts et du dataLayer
    const result = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText);

        const googleAnalyticsInstalled = scripts.some(s => s.includes('googletagmanager.com/gtag/js')) 
                                        || scripts.some(s => s.includes('analytics.js'));
        const googleTagManagerInstalled = scripts.some(s => s.includes('googletagmanager.com/gtm.js'));
        const matomoInstalled = scripts.some(s => s.includes('matomo.js') || s.includes('piwik.js'));
        const consentManagementInstalled = scripts.some(s => /cookiebot|onetrust|trustarc/i.test(s));

        // DataLayer pour détecter événements et e-commerce
        const dataLayer = window.dataLayer || [];
        const events = dataLayer.filter(d => d.event).map(d => d.event);
        const ecommerce = dataLayer.filter(d => d.ecommerce || d.transaction).map(d => d.ecommerce || d.transaction);

        return {
            googleAnalytics: googleAnalyticsInstalled,
            googleTagManager: googleTagManagerInstalled,
            matomo: matomoInstalled,
            consentManagement: consentManagementInstalled,
            eventsDetected: events,
            ecommerceDetected: ecommerce
        };
    });

    await browser.close();

    // Vérification Google Search Console / Bing Webmaster via meta tag
    let searchConsole = false;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const html = await response.text();
            searchConsole = /google-site-verification/i.test(html) || /bing-site-verification/i.test(html);
        }
    } catch (err) {
        console.warn("Impossible de vérifier Search Console:", err.message);
    }

    return {
        url,
        trackingTools: {
            googleAnalytics: result.googleAnalytics,
            googleTagManager: result.googleTagManager,
            matomo: result.matomo,
            consentManagement: result.consentManagement
        },
        searchConsole,
        events: result.eventsDetected,
        ecommerce: result.ecommerceDetected
    };
}

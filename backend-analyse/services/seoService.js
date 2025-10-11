// backend/services/seoService.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fetch from 'node-fetch';
import { URL } from 'url';

// Activation du plugin stealth pour contourner les protections anti-bot
puppeteer.use(StealthPlugin());

export async function seoAudit(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();

    // Simulation d'un vrai navigateur
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000); // attendre qu'un élément principal soit chargé
    } catch (err) {
        console.error("Erreur lors du chargement du site:", err.message);
    }

    const result = await page.evaluate(() => {
        const getHTags = () => Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
            tag: h.tagName.toLowerCase(),
            text: h.innerText.trim()
        }));

        const getStructuredData = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => { try { return JSON.parse(s.innerText); } catch { return null } })
            .filter(Boolean);

        const getLinks = () => Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(Boolean);

        const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
        const title = document.querySelector('title')?.innerText || null;
        const metaDescription = document.querySelector('meta[name="description"]')?.content || null;

        return { canonical, title, metaDescription, hTags: getHTags(), structuredData: getStructuredData(), links: getLinks() };
    });

    await browser.close();

    // Récupération du robots.txt
    let robots = null;
    let sitemap = null;
    try {
        const robotsResponse = await fetch(new URL('/robots.txt', url).href);
        if (robotsResponse.ok) {
            robots = await robotsResponse.text();
            const sitemapMatch = robots.match(/Sitemap:\s*(.+)/i);
            sitemap = sitemapMatch ? sitemapMatch[1].trim() : null;
        }
    } catch (err) {
        console.warn("Impossible de récupérer robots.txt:", err.message);
    }

    const uniqueLinks = Array.from(new Set(result.links));
    const internalLinks = uniqueLinks.filter(link => link.startsWith(url));
    const externalLinks = uniqueLinks.filter(link => !link.startsWith(url));

    const errors = [];
    if (!result.title) errors.push("Titre manquant");
    if (!result.metaDescription) errors.push("Meta description manquante");
    if (!result.hTags.some(h => h.tag === 'h1')) errors.push("H1 manquant");

    return {
        message: "SEO audit completed",
        result: {
            url,
            robots,
            sitemap,
            canonical: result.canonical,
            title: result.title,
            metaDescription: result.metaDescription,
            hTags: result.hTags,
            structuredData: result.structuredData,
            internalLinks,
            externalLinks,
            errors
        }
    };
}
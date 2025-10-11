// backend/services/performanceService.js
import { run as lighthouseRunner } from '../utils/lighthouseRunner.js';
import { getPageSizeAndRequests, checkCompression, checkCaching } from '../utils/puppeteerUtils.js';

export const runFullPerformanceAudit = async (url) => {
    // Lighthouse audit desktop
    const lhDesktop = await lighthouseRunner(url, 'desktop');
    // Lighthouse audit mobile
    const lhMobile = await lighthouseRunner(url, 'mobile');

    // Puppeteer audits
    const pageMetrics = await getPageSizeAndRequests(url);
    const compression = await checkCompression(url);
    const caching = await checkCaching(url);

    // Extraire audits Lighthouse utiles
    const audits = lhDesktop.audits;

    return {
        url,
        timing: {
            ttfb: lhDesktop.ttfb,
            fcp: lhDesktop.fcp,
            lcp: lhDesktop.lcp,
            tti: lhDesktop.tti
        },
        pageSize: pageMetrics,
        images: audits['efficient-images']?.details?.items || [],
        cssJs: {
            unusedCSS: audits['unused-css-rules']?.details?.items || [],
            unusedJS: audits['unused-javascript']?.details?.items || []
        },
        compression,
        caching,
        fonts: {
            fontDisplay: audits['font-display']?.details?.items || [],
            asyncFonts: audits['uses-webfont-loading']?.details?.items || []
        },
        mobile: {
            ttfb: lhMobile.ttfb,
            fcp: lhMobile.fcp,
            lcp: lhMobile.lcp,
            tti: lhMobile.tti
        },
        desktop: {
            ttfb: lhDesktop.ttfb,
            fcp: lhDesktop.fcp,
            lcp: lhDesktop.lcp,
            tti: lhDesktop.tti
        }
    };
};
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { URL } from 'url';

/**
 * Runner Lighthouse avancé avec extraction complète des métriques
 * @param {string} url - URL à auditer
 * @param {string} formFactor - 'mobile' ou 'desktop'
 * @returns {Object} Rapport complet avec scores, métriques et recommandations
 */
export const run = async (url, formFactor = 'desktop') => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    });

    try {
        const { port } = new URL(browser.wsEndpoint());
        
        const config = {
            port,
            output: 'json',
            logLevel: 'error',
            emulatedFormFactor: formFactor,
            throttlingMethod: 'simulate',
            throttling: {
                rttMs: formFactor === 'mobile' ? 150 : 40,
                throughputKbps: formFactor === 'mobile' ? 1638.4 : 10240,
                cpuSlowdownMultiplier: formFactor === 'mobile' ? 4 : 1
            },
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
            disableStorageReset: false
        };

        const lhResult = await lighthouse(url, config);
        const lhr = lhResult.lhr;

        const scores = {
            performance: Math.round((lhr.categories.performance?.score || 0) * 100),
            accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
            seo: Math.round((lhr.categories.seo?.score || 0) * 100),
            pwa: Math.round((lhr.categories.pwa?.score || 0) * 100),
            average: 0
        };
        scores.average = Math.round(
            (scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4
        );

        const metrics = {
            lcp: {
                value: lhr.audits['largest-contentful-paint']?.numericValue || 0,
                displayValue: lhr.audits['largest-contentful-paint']?.displayValue || 'N/A',
                score: lhr.audits['largest-contentful-paint']?.score || 0,
                grade: getGrade(lhr.audits['largest-contentful-paint']?.score)
            },
            fid: {
                value: lhr.audits['max-potential-fid']?.numericValue || 0,
                displayValue: lhr.audits['max-potential-fid']?.displayValue || 'N/A',
                score: lhr.audits['max-potential-fid']?.score || 0,
                grade: getGrade(lhr.audits['max-potential-fid']?.score)
            },
            cls: {
                value: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
                displayValue: lhr.audits['cumulative-layout-shift']?.displayValue || 'N/A',
                score: lhr.audits['cumulative-layout-shift']?.score || 0,
                grade: getGrade(lhr.audits['cumulative-layout-shift']?.score)
            },
            
            fcp: {
                value: lhr.audits['first-contentful-paint']?.numericValue || 0,
                displayValue: lhr.audits['first-contentful-paint']?.displayValue || 'N/A',
                score: lhr.audits['first-contentful-paint']?.score || 0,
                grade: getGrade(lhr.audits['first-contentful-paint']?.score)
            },
            si: {
                value: lhr.audits['speed-index']?.numericValue || 0,
                displayValue: lhr.audits['speed-index']?.displayValue || 'N/A',
                score: lhr.audits['speed-index']?.score || 0,
                grade: getGrade(lhr.audits['speed-index']?.score)
            },
            tti: {
                value: lhr.audits['interactive']?.numericValue || 0,
                displayValue: lhr.audits['interactive']?.displayValue || 'N/A',
                score: lhr.audits['interactive']?.score || 0,
                grade: getGrade(lhr.audits['interactive']?.score)
            },
            tbt: {
                value: lhr.audits['total-blocking-time']?.numericValue || 0,
                displayValue: lhr.audits['total-blocking-time']?.displayValue || 'N/A',
                score: lhr.audits['total-blocking-time']?.score || 0,
                grade: getGrade(lhr.audits['total-blocking-time']?.score)
            },
            ttfb: {
                value: lhr.audits['server-response-time']?.numericValue || 0,
                displayValue: lhr.audits['server-response-time']?.displayValue || 'N/A',
                score: lhr.audits['server-response-time']?.score || 0,
                grade: getGrade(lhr.audits['server-response-time']?.score)
            }
        };

        const resources = {
            images: extractResourceData(lhr.audits['uses-optimized-images']),
            fonts: extractResourceData(lhr.audits['font-display']),
            css: extractResourceData(lhr.audits['unused-css-rules']),
            javascript: extractResourceData(lhr.audits['unused-javascript']),
            thirdParty: extractThirdPartyData(lhr.audits['third-party-summary']),
            totalSize: {
                value: lhr.audits['total-byte-weight']?.numericValue || 0,
                displayValue: lhr.audits['total-byte-weight']?.displayValue || 'N/A',
                details: lhr.audits['total-byte-weight']?.details?.items || []
            }
        };

        const opportunities = extractOpportunities(lhr);

        const diagnostics = extractDiagnostics(lhr);

        const issues = extractIssues(lhr);

        const recommendations = generateRecommendations(scores, metrics, opportunities);

        const technical = {
            renderBlocking: {
                css: lhr.audits['render-blocking-resources']?.details?.items?.filter(
                    item => item.url?.endsWith('.css')
                ) || [],
                js: lhr.audits['render-blocking-resources']?.details?.items?.filter(
                    item => item.url?.endsWith('.js')
                ) || [],
                totalBlockingTime: lhr.audits['render-blocking-resources']?.numericValue || 0
            },
            networkRequests: {
                total: lhr.audits['network-requests']?.details?.items?.length || 0,
                details: lhr.audits['network-requests']?.details?.items?.slice(0, 20) || []
            },
            mainThread: {
                totalTime: lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
                breakdown: lhr.audits['mainthread-work-breakdown']?.details?.items || []
            },
            cachePolicy: lhr.audits['uses-long-cache-ttl']?.details?.items || [],
            domSize: {
                total: lhr.audits['dom-size']?.numericValue || 0,
                details: lhr.audits['dom-size']?.details || {}
            }
        };

        const screenshots = {
            final: lhr.audits['final-screenshot']?.details?.data || null,
            filmstrip: lhr.audits['screenshot-thumbnails']?.details?.items || []
        };

        const benchmarks = {
            isGood: metrics.lcp.value < 2500 && metrics.fid.value < 100 && metrics.cls.value < 0.1,
            isMedium: metrics.lcp.value < 4000 && metrics.fid.value < 300 && metrics.cls.value < 0.25,
            isPoor: metrics.lcp.value >= 4000 || metrics.fid.value >= 300 || metrics.cls.value >= 0.25,
            competitiveScore: calculateCompetitiveScore(scores, metrics)
        };

        await browser.close();

        return {
            url,
            device: formFactor,
            timestamp: new Date().toISOString(),
            scores,
            metrics,
            resources,
            opportunities,
            diagnostics,
            issues,
            recommendations,
            technical,
            screenshots,
            benchmarks,
            rawAudits: lhr.audits 
        };

    } catch (error) {
        await browser.close();
        throw new Error(`Lighthouse audit failed: ${error.message}`);
    }
};

function getGrade(score) {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.65) return 'C';
    if (score >= 0.5) return 'D';
    return 'F';
}

function extractResourceData(audit) {
    if (!audit) return { score: 0, items: [] };
    
    return {
        score: audit.score || 0,
        savings: audit.numericValue || 0,
        displayValue: audit.displayValue || 'N/A',
        items: (audit.details?.items || []).map(item => ({
            url: item.url,
            size: item.totalBytes || item.wastedBytes || 0,
            wastedPercentage: item.wastedPercent || 0,
            wastedTime: item.wastedMs || 0
        }))
    };
}

function extractThirdPartyData(audit) {
    if (!audit || !audit.details) return { total: 0, items: [] };
    
    return {
        total: audit.details.items?.length || 0,
        mainThreadTime: audit.numericValue || 0,
        items: (audit.details.items || []).slice(0, 10).map(item => ({
            entity: item.entity?.text || 'Unknown',
            mainThreadTime: item.mainThreadTime || 0,
            blockingTime: item.blockingTime || 0,
            transferSize: item.transferSize || 0
        }))
    };
}

function extractOpportunities(lhr) {
    const opportunityAudits = [
        'uses-optimized-images',
        'uses-webp-images',
        'offscreen-images',
        'unminified-css',
        'unminified-javascript',
        'unused-css-rules',
        'unused-javascript',
        'uses-responsive-images',
        'efficient-animated-content',
        'duplicated-javascript',
        'legacy-javascript',
        'uses-text-compression',
        'uses-rel-preconnect',
        'server-response-time',
        'redirects',
        'uses-rel-preload',
        'total-byte-weight'
    ];

    return opportunityAudits
        .map(auditId => {
            const audit = lhr.audits[auditId];
            if (!audit || audit.score >= 0.9) return null;
            
            return {
                id: auditId,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                impact: getImpactLevel(audit.score),
                savings: {
                    time: audit.numericValue || 0,
                    bytes: audit.details?.overallSavingsBytes || 0,
                    displayValue: audit.displayValue || ''
                },
                items: (audit.details?.items || []).slice(0, 5)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score);
}

function extractDiagnostics(lhr) {
    const diagnosticAudits = [
        'font-display',
        'largest-contentful-paint-element',
        'layout-shift-elements',
        'long-tasks',
        'non-composited-animations',
        'critical-request-chains',
        'user-timings',
        'bootup-time',
        'mainthread-work-breakdown',
        'dom-size',
        'network-rtt',
        'network-server-latency',
        'uses-passive-event-listeners',
        'no-document-write'
    ];

    return diagnosticAudits
        .map(auditId => {
            const audit = lhr.audits[auditId];
            if (!audit) return null;
            
            return {
                id: auditId,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue || '',
                details: audit.details?.items || audit.details || null
            };
        })
        .filter(Boolean);
}

function extractIssues(lhr) {
    const issues = {
        critical: [],
        high: [],
        medium: [],
        low: []
    };

    Object.values(lhr.audits).forEach(audit => {
        if (audit.score === null || audit.score === 1) return;
        
        const issue = {
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue
        };

        if (audit.score === 0) {
            issues.critical.push(issue);
        } else if (audit.score < 0.5) {
            issues.high.push(issue);
        } else if (audit.score < 0.8) {
            issues.medium.push(issue);
        } else {
            issues.low.push(issue);
        }
    });

    return issues;
}

function getImpactLevel(score) {
    if (score < 0.3) return 'critical';
    if (score < 0.5) return 'high';
    if (score < 0.8) return 'medium';
    return 'low';
}

function generateRecommendations(scores, metrics, opportunities) {
    const recommendations = [];

    if (metrics.lcp.value > 4000) {
        recommendations.push({
            priority: 'critical',
            category: 'Core Web Vitals',
            title: 'Améliorer le Largest Contentful Paint',
            description: `Votre LCP est de ${metrics.lcp.displayValue}, ce qui est considéré comme mauvais. Objectif: < 2.5s`,
            actions: [
                'Optimiser les images principales',
                'Utiliser un CDN',
                'Précharger les ressources critiques',
                'Réduire le temps de réponse serveur'
            ],
            estimatedImpact: 'high',
            effort: 'medium'
        });
    }

    if (metrics.cls.value > 0.25) {
        recommendations.push({
            priority: 'critical',
            category: 'Core Web Vitals',
            title: 'Corriger le Cumulative Layout Shift',
            description: `Votre CLS est de ${metrics.cls.displayValue}, ce qui cause des décalages visuels importants`,
            actions: [
                'Définir des dimensions pour images et vidéos',
                'Éviter l\'injection de contenu dynamique',
                'Utiliser des polices web avec font-display: swap'
            ],
            estimatedImpact: 'high',
            effort: 'low'
        });
    }

    opportunities.slice(0, 5).forEach(opp => {
        if (opp.savings.time > 1000 || opp.savings.bytes > 100000) {
            recommendations.push({
                priority: opp.impact === 'critical' ? 'critical' : 'high',
                category: 'Performance',
                title: opp.title,
                description: opp.description,
                savings: opp.savings.displayValue,
                estimatedImpact: opp.impact,
                effort: estimateEffort(opp.id)
            });
        }
    });

    if (scores.accessibility < 70) {
        recommendations.push({
            priority: 'high',
            category: 'Accessibilité',
            title: 'Améliorer l\'accessibilité du site',
            description: `Score d'accessibilité: ${scores.accessibility}/100`,
            actions: [
                'Ajouter des attributs alt aux images',
                'Améliorer le contraste des couleurs',
                'Structurer correctement les headings',
                'Ajouter des labels aux formulaires'
            ],
            estimatedImpact: 'medium',
            effort: 'low'
        });
    }

    return recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

function estimateEffort(auditId) {
    const lowEffort = ['font-display', 'uses-text-compression', 'uses-rel-preconnect'];
    const highEffort = ['unused-javascript', 'legacy-javascript', 'critical-request-chains'];
    
    if (lowEffort.includes(auditId)) return 'low';
    if (highEffort.includes(auditId)) return 'high';
    return 'medium';
}

function calculateCompetitiveScore(scores, metrics) {
    let competitiveScore = 0;
    
    competitiveScore += (scores.performance / 100) * 40;
    
    const cwvScore = (
        (metrics.lcp.value < 2500 ? 1 : metrics.lcp.value < 4000 ? 0.5 : 0) +
        (metrics.fid.value < 100 ? 1 : metrics.fid.value < 300 ? 0.5 : 0) +
        (metrics.cls.value < 0.1 ? 1 : metrics.cls.value < 0.25 ? 0.5 : 0)
    ) / 3;
    competitiveScore += cwvScore * 30;
    
    competitiveScore += (scores.seo / 100) * 15;
    
    competitiveScore += (scores.accessibility / 100) * 10;
    
    competitiveScore += (scores.bestPractices / 100) * 5;
    
    return Math.round(competitiveScore);
}

export {
    getGrade,
    extractResourceData,
    extractThirdPartyData,
    extractOpportunities,
    extractDiagnostics,
    extractIssues,
    generateRecommendations,
    calculateCompetitiveScore
};
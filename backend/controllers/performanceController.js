import * as performanceService from '../services/performanceService.js';

export const createAudit = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const auditResult = await performanceService.runFullPerformanceAudit(url);
        res.status(200).json({ message: "Audit completed", result: auditResult });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
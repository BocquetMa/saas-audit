import { analyzeTracking } from '../services/trackingService.js';

export async function trackingAudit(req, res) {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: "URL manquante" });
    }

    try {
        const result = await analyzeTracking(url);
        return res.status(200).json({
            message: "Tracking audit completed",
            result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'analyse du tracking" });
    }
}
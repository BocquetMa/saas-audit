import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import performanceRoutes from './routes/performanceRoutes.js';
import infrastructureRoutes from './routes/infrastructureRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import accessibilityRoutes from './routes/accessibilityRoutes.js';
import uxRoutes from './routes/uxRoutes.js';
import mobileRoutes from './routes/mobileRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', performanceRoutes);
app.use('/api', infrastructureRoutes);
app.use('/api', securityRoutes);
app.use('/api', seoRoutes);
app.use('/api', trackingRoutes);
app.use('/api', accessibilityRoutes);
app.use('/api', uxRoutes);
app.use('/api', mobileRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Web Audit API Backend',
        status: 'running',
        endpoints: {
            performance: '/api/performance',
            infrastructure: '/api/infrastructure',
            security: '/api/security',
            seo: '/api/seo',
            tracking: '/api/tracking',
            accessibility: '/api/accessibility',
            ux: '/api/ux',
            mobile: '/api/mobile'
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: true,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
});

export default app;
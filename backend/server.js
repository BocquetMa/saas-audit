import express from 'express';
import cors from 'cors';
import performanceRoutes from './routes/performanceRoutes.js';
import infrastructureRoutes from './routes/infrastructureRoutes.js'; // 👈 nouvelle route
import securityRoutes from './routes/securityRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import accessibilityRoutes from './routes/accessibilityRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes principales
app.use('/api', performanceRoutes);
app.use('/api', infrastructureRoutes); // 👈 ajout de la route infra
app.use('/api', securityRoutes)
app.use('/api', seoRoutes);
app.use('/api', trackingRoutes);
app.use('/api', accessibilityRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
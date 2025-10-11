import app from './app';
import logger from './config/logger';
import { PrismaClient } from '@prisma/client';
import redis from './config/redis';

// Ne pas hardcoder l'URL - Prisma utilise automatiquement DATABASE_URL du .env
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test de connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully');

    // Test de connexion à Redis
    await redis.ping();
    logger.info('Redis connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

startServer();
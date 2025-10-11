import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// router.use('/users', userRoutes);

export default router;
import express, { Request, Response } from 'express';
import authService from '../services/auth.service';
import { authenticate } from '../middlewares/auth.middleware';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const validate = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
    body('name').optional().trim().isLength({ min: 2 })
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const user = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Inscription réussie. Veuillez vérifier votre email.',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body);

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token requis')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: 'Token rafraîchi',
        data: tokens
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await authService.logout(req.user!.userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Email invalide')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token requis'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
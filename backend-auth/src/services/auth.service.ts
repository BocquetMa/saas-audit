import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

class AuthService {
  private JWT_SECRET: string;
  private JWT_REFRESH_SECRET: string;
  private JWT_EXPIRES_IN = '15m';
  private JWT_REFRESH_EXPIRES_IN = '7d';

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be defined in environment variables');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
  }

  // Inscription
  async register(data: RegisterData) {
    const { email, password, name } = data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer token de vérification email
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerificationToken
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // TODO: Envoyer email de vérification
    // await emailService.sendVerificationEmail(email, emailVerificationToken);

    return user;
  }

  // Connexion
  async login(data: LoginData) {
    const { email, password } = data;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Générer les tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Sauvegarder le refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      ...tokens
    };
  }

  // Générer les tokens JWT
  private generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(
      payload, 
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload, 
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  // Rafraîchir le token
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;

      // Vérifier que le refresh token existe en BDD
      const user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          refreshToken
        }
      });

      if (!user) {
        throw new Error('Refresh token invalide');
      }

      // Générer de nouveaux tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Mettre à jour le refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      return tokens;
    } catch (error) {
      throw new Error('Refresh token invalide ou expiré');
    }
  }

  // Vérifier le token d'accès
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
  }

  // Demande de réinitialisation de mot de passe
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Par sécurité, on ne révèle pas si l'email existe
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
    }

    // Générer token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      }
    });

    // TODO: Envoyer email avec le lien de réinitialisation
    // await emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
  }

  // Réinitialiser le mot de passe
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new Error('Token invalide ou expiré');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null // Invalider tous les tokens existants
      }
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // Déconnexion
  async logout(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    return { message: 'Déconnexion réussie' };
  }

  // Vérifier l'email
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      throw new Error('Token de vérification invalide');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null
      }
    });

    return { message: 'Email vérifié avec succès' };
  }
}

export default new AuthService();
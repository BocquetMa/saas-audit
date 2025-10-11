import nodemailer from 'nodemailer';
import logger from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready to send messages');
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'SaaS Audit'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue sur SaaS Audit !</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Merci de vous être inscrit sur SaaS Audit. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Vérifier mon email</a>
              </div>
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              <p><strong>Ce lien expirera dans 24 heures.</strong></p>
              <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SaaS Audit - Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '✉️ Vérifiez votre adresse email',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #f5576c;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer :</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien expirera dans 1 heure pour des raisons de sécurité.
              </div>
              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SaaS Audit - Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🔐 Réinitialisation de votre mot de passe',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .features {
              background: white;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .feature-item {
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Bienvenue ${name} !</h1>
            </div>
            <div class="content">
              <p>Votre compte est maintenant activé et prêt à être utilisé !</p>
              <div class="features">
                <h3>Ce que vous pouvez faire avec SaaS Audit :</h3>
                <div class="feature-item">✅ Analyser la performance de vos sites web</div>
                <div class="feature-item">🔒 Vérifier la sécurité et les certificats SSL</div>
                <div class="feature-item">🔍 Optimiser votre SEO technique</div>
                <div class="feature-item">♿ Contrôler l'accessibilité WCAG</div>
                <div class="feature-item">📊 Obtenir des rapports détaillés</div>
              </div>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Accéder au tableau de bord</a>
              </div>
              <p>Besoin d'aide ? Notre documentation est à votre disposition ou contactez notre support.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SaaS Audit - Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🎉 Bienvenue sur SaaS Audit !',
      html,
    });
  }

  async sendAuditCompleteEmail(email: string, auditUrl: string, score: number): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .score {
              font-size: 48px;
              font-weight: bold;
              text-align: center;
              color: ${score >= 80 ? '#38ef7d' : score >= 50 ? '#ffa502' : '#ff6348'};
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #11998e;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Votre audit est terminé !</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Votre audit de site web est maintenant disponible.</p>
              <div class="score">${score}/100</div>
              <p style="text-align: center; color: #666;">Score global</p>
              <div style="text-align: center;">
                <a href="${auditUrl}" class="button">Voir le rapport complet</a>
              </div>
              <p>Le rapport contient des analyses détaillées et des recommandations pour améliorer votre site.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SaaS Audit - Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `📊 Votre audit est prêt - Score: ${score}/100`,
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

export default new EmailService();
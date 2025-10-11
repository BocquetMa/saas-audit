import 'dotenv/config';
import emailService from './src/services/email.service';

async function testEmails() {
  const testEmail = process.env.SMTP_USER || 'matheo.bocquet18@gmail.com';
  
  console.log('🧪 Test du service email...\n');

  try {
    // Test 1: Email de vérification
    console.log('1️⃣ Test email de vérification...');
    await emailService.sendVerificationEmail(
      testEmail,
      'test-token-123456'
    );
    console.log('✅ Email de vérification envoyé\n');

    // Test 2: Email de réinitialisation
    console.log('2️⃣ Test email de réinitialisation...');
    await emailService.sendPasswordResetEmail(
      testEmail,
      'reset-token-123456'
    );
    console.log('✅ Email de réinitialisation envoyé\n');

    // Test 3: Email de bienvenue
    console.log('3️⃣ Test email de bienvenue...');
    await emailService.sendWelcomeEmail(
      testEmail,
      'Mathieu'
    );
    console.log('✅ Email de bienvenue envoyé\n');

    // Test 4: Email d'audit terminé
    console.log('4️⃣ Test email audit terminé...');
    await emailService.sendAuditCompleteEmail(
      testEmail,
      'http://localhost:3000/audits/123',
      87
    );
    console.log('✅ Email audit terminé envoyé\n');

    console.log('🎉 Tous les tests sont passés ! Vérifiez votre boîte email.');
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

testEmails();
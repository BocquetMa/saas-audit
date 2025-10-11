// test-pg-direct.js
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres', // On se connecte d'abord à la DB par défaut
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connexion à PostgreSQL réussie!');
    
    const res = await client.query('SELECT version()');
    console.log('📊 Version PostgreSQL:', res.rows[0].version);
    
    // Vérifier si mydb existe
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'mydb'"
    );
    
    if (dbCheck.rows.length === 0) {
      console.log('⚠️  La base "mydb" n\'existe pas. Création...');
      await client.query('CREATE DATABASE mydb');
      console.log('✅ Base de données "mydb" créée!');
    } else {
      console.log('✅ La base de données "mydb" existe déjà!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await client.end();
  }
}

test();
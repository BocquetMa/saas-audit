import db from './config/db.js';

const testConnection = async () => {
    try {
        const [rows] = await db.query('SELECT 1+1 AS result');
        console.log('DB connection ok:', rows[0].result);
    } catch (err) {
        console.error('DB connection error:', err.message);
    }
};

testConnection();
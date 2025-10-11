import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "web_audit",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      ssl: { rejectUnauthorized: true },
    });

    const [rows] = await connection.execute("SELECT NOW()");
    console.log("✅ Connected successfully:", rows);
    await connection.end();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
}

await testConnection();

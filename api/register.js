import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Load Aiven CA certificate
    const caCertPath = path.join(process.cwd(), "ca.pem");
    const caCert = fs.readFileSync(caCertPath);

    // Connect to Aiven MySQL with SSL
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      ssl: { ca: caCert },
    });

    // Ensure table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert user
    await connection.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );

    await connection.end();

    res.status(201).json({ message: "✅ Registration successful!" });
  } catch (err) {
    console.error("❌ Database error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "⚠️ Email already registered" });
    }
    res.status(500).json({ error: "Database connection failed" });
  }
}

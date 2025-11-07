import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const createUsersTable = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true },
  });

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255)
    );
  `;

  await connection.query(createTableQuery);
  await connection.end();
  console.log("✅ Users table ensured.");
};

await createUsersTable();

export default async function handler(req, res) {
  res.json({ message: "Users table is ready." });
}

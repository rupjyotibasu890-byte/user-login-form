import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// MySQL Connection
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: { rejectUnauthorized: true },
});

// Create users table if not exists
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Users table ready");
    connection.release();
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
})();

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Register Route
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (email, password) VALUES (?, ?)", [
      email,
      hashedPassword,
    ]);
    res.send("✅ Registration successful! You can now log in.");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).send("❌ Email already registered!");
    } else {
      console.error(err);
      res.status(500).send("❌ Server error during registration");
    }
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).send("❌ User not found");

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("❌ Invalid password");

    req.session.user = { id: user.id, email: user.email };
    res.send(`✅ Welcome, ${user.email}!`);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error during login");
  }
});

// Protected route example
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.status(401).send("Unauthorized access");
  res.send(`Welcome to your dashboard, ${req.session.user.email}!`);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

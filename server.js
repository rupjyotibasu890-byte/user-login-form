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

// ✅ MySQL connection pool with inline SSL from .env
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    ca: process.env.MYSQL_SSL_CA.replace(/\\n/g, "\n"), // ✅ no file read — uses inline cert
  },
});

// Auto-create users table
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

// Register route
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashed]);
    res.send("✅ Registration successful! You can now log in.");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).send("❌ Email already exists!");
    } else {
      console.error(err);
      res.status(500).send("❌ Server error during registration");
    }
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).send("❌ User not found");

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("❌ Invalid password");

    req.session.user = { id: user.id, email: user.email };
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error during login");
  }
});

// Dashboard route
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI';
            background: #f5f6fa;
            text-align: center;
            padding-top: 100px;
          }
          h2 {
            color: #333;
          }
          button {
            background: #66a6ff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
          }
          button:hover {
            background: #4a8ef0;
          }
        </style>
      </head>
      <body>
        <h2>Welcome, ${req.session.user.email}</h2>
        <form action="/logout" method="GET">
          <button type="submit">Logout</button>
        </form>
      </body>
    </html>
  `);
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

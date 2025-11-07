import express from "express";
import bcrypt from "bcryptjs"; // ✅ changed
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: { ca: process.env.MYSQL_SSL_CA.replace(/\\n/g, "\n") },
});

// Registration
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (email, password) VALUES (?, ?)", [
      email,
      hashedPassword,
    ]);
    res.send("✅ Registration successful");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error during registration");
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).send("❌ User not found");

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).send("❌ Invalid password");

    req.session.user = { id: rows[0].id, email: rows[0].email };
    res.send("✅ Login successful");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error during login");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});

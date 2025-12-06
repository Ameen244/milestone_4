const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("./database/database.sqlite", (err) => {
  if (err) console.error("Database Error:", err);
});

db.exec("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    isDone INTEGER DEFAULT 0,
    isOverDue INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip TEXT NOT NULL,
    success INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

module.exports = db;

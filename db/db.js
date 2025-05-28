const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const dbFolder = app.getPath("userData");
const dbPath = path.join(dbFolder, "app.db");

console.log("Database path:", dbPath);

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error("เปิด DB ไม่ได้:", err.message);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      sell_price INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sell_price INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,  -- เช่น "2025-05"
      cost_total INTEGER NOT NULL
    )
  `, () => {
    console.log("Tables created (if not exists)");
  });

  db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
    if (err) return console.error(err);

    console.log("row products:", row.count);

    if (row.count === 0) {
      db.run("INSERT INTO products (name, sell_price) VALUES (?, ?)", ["โค้ก", 25]);
      db.run("INSERT INTO products (name, sell_price) VALUES (?, ?)", ["น้ำเปล่า", 10], () => {
        console.log("Mock product data added");
      });
    }
  });
});

module.exports = db;

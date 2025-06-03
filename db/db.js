const sqlite3 = require("sqlite3").verbose();
const { join } = require("path");
const { existsSync, mkdirSync } = require("fs");

const dbFolder = "./userData";
const dbPath = join(dbFolder, "app.db");

if (!existsSync(dbFolder)) {
  mkdirSync(dbFolder, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not open database", err);
  } else {
    console.log("Database opened successfully");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      received_amount REAL NOT NULL,
      change_amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      bill_number TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);


  db.get("SELECT COUNT(*) AS count FROM products", [], (err, row) => {
    if (err) {
      console.error("Error checking product count:", err);
      return;
    }
    const count = row.count;
    if (count === 0) {
      db.run(
        "INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)",
        ["โค้ก", 2, 25],
        function (err) {
          if (err) console.error("Error inserting 'โค้ก':", err);
          else console.log("Inserted 'โค้ก'");
        }
      );
      db.run(
        "INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)",
        ["น้ำเปล่า", 3, 10],
        function (err) {
          if (err) console.error("Error inserting 'น้ำเปล่า':", err);
          else console.log("Inserted 'น้ำเปล่า'");
        }
      );
    }
  });
});

module.exports = db;

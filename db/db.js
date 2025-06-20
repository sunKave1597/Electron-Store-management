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
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      received_amount REAL NOT NULL,
      change_amount REAL NOT NULL,
      date TEXT NOT NULL,
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
      date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff'))
    );
  `, (err) => {
    if (err) {
      console.error("Error creating users table:", err);
      return;
    }
    db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
      if (err) {
        console.error("Error checking for admin user:", err);
        return;
      }
      if (!row) {
        const plainPassword = "admin123";
        db.run(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          ["admin", plainPassword, "admin"],
          function (err) {
            if (err) console.error("Error inserting admin user:", err);
            else console.log("Default admin user inserted with plain password.");
          }
        );
      }
    });
  });

  db.get("SELECT COUNT(*) AS count FROM products", [], (err, row) => {
    if (err) {
      console.error("Error checking product count:", err);
      return;
    }
    const count = row.count;
    if (count === 0) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dbDate = `${year}-${month}-${day}`; // YYYY-MM-DD format

      db.run(
        "INSERT INTO products (name, quantity, price, date) VALUES (?, ?, ?, ?)",
        ["โค้ก", 2, 25, dbDate],
        function (err) {
          if (err) console.error("Error inserting 'โค้ก':", err);
          else console.log("Inserted 'โค้ก'");
        }
      );
      db.run(
        "INSERT INTO products (name, quantity, price, date) VALUES (?, ?, ?, ?)",
        ["น้ำเปล่า", 3, 10, dbDate],
        function (err) {
          if (err) console.error("Error inserting 'น้ำเปล่า':", err);
          else console.log("Inserted 'น้ำเปล่า'");
        }
      );
    }
  });
});

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getTotalIncomeDB = () => {
  return dbGet("SELECT SUM(total_amount) AS totalIncome FROM bills");
};

const getTotalExpensesDB = () => {
  return dbGet("SELECT SUM(amount) AS totalExpenses FROM expense");
};

const getReportDataDB = async (month) => { // month format "M/YYYY" or null
  let dailyIncome = [];
  let dailyProfit = [];
  let tableData = [];
  let labels = [];

  let startDate, endDate;
  if (month) {
    const [m, y] = month.split('/');
    startDate = new Date(y, parseInt(m) - 1, 1);
    endDate = new Date(y, parseInt(m), 0);
  } else {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
  }

  const formatDate = (date) => {
    let d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const incomeByDay = await dbAll(
    "SELECT date, SUM(total_amount) AS dailyTotal FROM bills WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date",
    [formattedStartDate, formattedEndDate]
  );

  const expensesByDay = await dbAll(
    "SELECT date, SUM(amount) AS dailyTotal FROM expense WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date",
    [formattedStartDate, formattedEndDate]
  );

  let tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    const dateStr = formatDate(tempDate);
    labels.push(dateStr.substring(5)); // Label as MM-DD

    const incomeEntry = incomeByDay.find(i => i.date === dateStr);
    const incomeForDay = incomeEntry ? incomeEntry.dailyTotal : 0;
    dailyIncome.push(incomeForDay);

    const expenseEntry = expensesByDay.find(e => e.date === dateStr);
    const expenseForDay = expenseEntry ? expenseEntry.dailyTotal : 0;

    dailyProfit.push(incomeForDay - expenseForDay);

    tempDate.setDate(tempDate.getDate() + 1);
  }


  // Simplified table data for bills with aggregated item names
  const billsForTable = await dbAll(
    `SELECT b.date, b.bill_number, GROUP_CONCAT(bi.product_name, ', ') AS items, SUM(bi.quantity) as quantity, b.total_amount as total 
     FROM bills b 
     JOIN bill_items bi ON b.id = bi.bill_id 
     WHERE b.date BETWEEN ? AND ? 
     GROUP BY b.id 
     ORDER BY b.date DESC`,
    [formattedStartDate, formattedEndDate]
  );

  tableData = billsForTable.map(b => ({
    date: b.date,
    billNumber: b.bill_number,
    items: b.items,
    quantity: b.quantity,
    price: null, // Not easily available per-bill, would need more complex logic
    total: b.total,
    profit: null, // Profit per bill is complex without cost of goods for that bill
  }));

  const expensesForTable = await dbAll(
    "SELECT date, item AS items, amount AS total FROM expense WHERE date BETWEEN ? AND ? ORDER BY date DESC",
    [formattedStartDate, formattedEndDate]
  );

  expensesForTable.forEach(e => tableData.push({
    date: e.date,
    billNumber: 'รายจ่าย',
    items: e.items,
    quantity: null,
    price: null,
    total: -e.total, // Show expenses as negative
    profit: null,
  }));

  tableData.sort((a, b) => new Date(b.date) - new Date(a.date));


  return {
    chartData: {
      labels: labels,
      revenue: dailyIncome,
      profit: dailyProfit
    },
    tableData: tableData
  };
};

module.exports = {
  db,
  dbAll,
  dbGet,
  getTotalIncomeDB,
  getTotalExpensesDB,
  getReportDataDB,
};

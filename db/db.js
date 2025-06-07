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
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      bill_number TEXT NOT NULL,
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




  db.get("SELECT COUNT(*) AS count FROM products", [], (err, row) => {
    if (err) {
      console.error("Error checking product count:", err);
      return;
    }
    const count = row.count;
    if (count === 0) {
      const date = new Date();

      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        numberingSystem: "latn",
      };

      const thaiFormatted = new Intl.DateTimeFormat("th-TH", options).formatToParts(date);

      const day = thaiFormatted.find(p => p.type === "day").value;
      const month = thaiFormatted.find(p => p.type === "month").value;
      const gregorianYear = date.getFullYear();

      const thDate = `${day}/${month}/${gregorianYear}`;
      db.run(
        "INSERT INTO products (name, quantity, price, date) VALUES (?, ?, ?, ?)",
        ["โค้ก", 2, 25, thDate],
        function (err) {
          if (err) console.error("Error inserting 'โค้ก':", err);
          else console.log("Inserted 'โค้ก'");
        }
      );
      db.run(
        "INSERT INTO products (name, quantity, price, date) VALUES (?, ?, ?, ?)",
        ["น้ำเปล่า", 3, 10, thDate],
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

const getReportDataDB = async (month) => { // month format "MM/YYYY" or null
  let dailyIncome = [];
  let dailyExpenses = [];
  let tableData = [];
  let labels = [];

  // Chart Data: Daily income and expenses for the given month or last 30 days if no month
  let startDate, endDate;
  if (month) {
    const [m, y] = month.split('/');
    startDate = new Date(y, parseInt(m) - 1, 1);
    endDate = new Date(y, parseInt(m), 0); // Last day of the month
  } else {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); // Last 30 days
  }

  const formatDate = (date) => {
    let d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-'); // YYYY-MM-DD for SQLite
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  // SQLite uses date strings. Ensure 'date' column in bills and expense is in 'YYYY-MM-DD' or compatible.
  // Assuming 'bills.date' and 'expense.date' are stored in a way that allows string comparison.
  // The original schema shows 'date TEXT NOT NULL'. Let's assume 'YYYY-MM-DD'.

  const incomeByDay = await dbAll(
    "SELECT date, SUM(total_amount) AS dailyTotal FROM bills WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date",
    [formattedStartDate, formattedEndDate]
  );

  const expensesByDay = await dbAll(
    "SELECT date, SUM(amount) AS dailyTotal FROM expense WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date",
    [formattedStartDate, formattedEndDate]
  );

  // Prepare chart data
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    labels.push(dateStr.substring(5)); // MM-DD for label

    const incomeEntry = incomeByDay.find(i => i.date === dateStr);
    dailyIncome.push(incomeEntry ? incomeEntry.dailyTotal : 0);

    const expenseEntry = expensesByDay.find(e => e.date === dateStr);
    dailyExpenses.push(expenseEntry ? expenseEntry.dailyTotal : 0);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const dailyProfit = dailyIncome.map((inc, index) => inc - dailyExpenses[index]);

  // Table Data: All bills and expenses for the period
  const billsForTable = await dbAll(
    "SELECT date, bill_number, GROUP_CONCAT(bi.product_name, ', ') AS items, SUM(bi.quantity) as quantity, SUM(bi.total) as total FROM bills b JOIN bill_items bi ON b.id = bi.bill_id WHERE b.date BETWEEN ? AND ? GROUP BY b.id ORDER BY b.date DESC",
    [formattedStartDate, formattedEndDate]
  );
  // Note: Profit per bill is complex if costs aren't stored per bill_item.
  // For now, tableData will show income transactions and expense transactions separately.
  // Or, combine them and mark type. Let's list bills and then expenses.

  tableData = billsForTable.map(b => ({
    date: b.date,
    billNumber: b.bill_number,
    items: b.items,
    quantity: b.quantity,
    price: null, // Price per unit is not directly available here, would need more specific query if required
    total: b.total, // This is income
    profit: null, // Profit per bill is hard without cost of goods for that bill
    type: 'income'
  }));

  const expensesForTable = await dbAll(
    "SELECT date, item AS items, amount AS total FROM expense WHERE date BETWEEN ? AND ? ORDER BY date DESC",
    [formattedStartDate, formattedEndDate]
  );

  expensesForTable.forEach(e => tableData.push({
    date: e.date,
    billNumber: '-',
    items: e.items,
    quantity: null,
    price: null,
    total: e.total, // This is an expense
    profit: null,
    type: 'expense'
  }));

  // Sort combined data by date
  tableData.sort((a, b) => new Date(b.date) - new Date(a.date));


  return {
    chartData: {
      labels: labels,
      revenue: dailyIncome, // "รายรับ"
      profit: dailyProfit   // "กำไร" (รายรับ - ทุน)
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

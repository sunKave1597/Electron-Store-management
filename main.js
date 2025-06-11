const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, dbAll, dbGet, getTotalIncomeDB, getTotalExpensesDB, getReportDataDB } = require('./db/db');


function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.webContents.openDevTools({ mode: "detach" });

    win.setMenu(null);
    win.loadFile('pages/menu.html');
}

app.whenReady().then(createWindow);

// Helper to get date in YYYY-MM-DD format
const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function handleIpc(channel, handler) {
    ipcMain.handle(channel, async (event, ...args) => {
        try {
            return await handler(event, ...args);
        } catch (error) {
            console.error(`❌ IPC Error on "${channel}":`, error.message || error);
            throw error;
        }
    });
}

handleIpc('get-products', () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM products", (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
});

handleIpc('add-product', (_, name, quantity, price) => {
    return new Promise((resolve, reject) => {
        const dbDate = getFormattedDate(); // Use standardized date format
        db.run(
            "INSERT INTO products (name, quantity, price, date) VALUES (?, ?, ?, ?)",
            [name, quantity, price, dbDate],
            function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID });
            }
        );
    });
});

handleIpc('delete-product', (_, id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM products WHERE id = ?", [id], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
});
handleIpc('create-bill', async (_, billData) => {
    const { billNumber, totalAmount, receivedAmount, changeAmount, items } = billData;

    return new Promise((resolve, reject) => {
        const dbDate = getFormattedDate(); // Use standardized date format
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `INSERT INTO bills (bill_number, items, total_amount, received_amount, change_amount, date) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    billNumber,
                    items.map(item => `${item.productName} (${item.quantity})`).join(', '),
                    totalAmount,
                    receivedAmount,
                    changeAmount,
                    dbDate // Use standardized date
                ],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }

                    const billId = this.lastID;

                    const stmt = db.prepare(
                        `INSERT INTO bill_items (bill_id, product_id, product_name, price, quantity, total) 
                         VALUES (?, ?, ?, ?, ?, ?)`
                    );

                    for (const item of items) {
                        stmt.run(
                            billId,
                            item.productId,
                            item.productName,
                            item.price,
                            item.quantity,
                            item.total
                        );
                    }

                    stmt.finalize((err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }

                        db.run('COMMIT', (err) => {
                            if (err) return reject(err);
                            resolve({ billId });
                        });
                    });
                }
            );
        });
    });
});

handleIpc('get-bills', () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, bill_number, items, total_amount, date, created_at 
             FROM bills 
             ORDER BY created_at DESC`,
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
});

handleIpc('get-bill-detail', (_, billId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM bills WHERE id = ?", [billId], (err, bill) => {
            if (err) return reject(err);

            db.all("SELECT * FROM bill_items WHERE bill_id = ?", [billId], (err, items) => {
                if (err) return reject(err);

                resolve({
                    bill: bill,
                    items: items
                });
            });
        });
    });
});


handleIpc('delete-bill', (_, id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM bill_items WHERE bill_id = ?", [id], (err) => {
            if (err) return reject(err);
            db.run("DELETE FROM bills WHERE id = ?", [id], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
});

ipcMain.handle('add-expense', async (event, expenseData) => {
    return new Promise((resolve, reject) => {
        const { item, amount } = expenseData;
        const dbDate = getFormattedDate(); // Use standardized date format

        db.run(
            `INSERT INTO expense (date, item, amount) VALUES (?, ?, ?)`,
            [dbDate, item, amount],
            function (err) {
                if (err) {
                    console.error('Error inserting expense:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
});
ipcMain.handle('get-expenses', async () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT id, date, item, amount FROM expense ORDER BY date DESC`, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

handleIpc('delete-expense', async (event, expenseId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM expense WHERE id = ?", [expenseId], function (err) {
            if (err) {
                console.error('Error deleting expense:', err);
                return reject(err);
            }
            if (this.changes === 0) {
                console.warn(`Attempted to delete expense with ID ${expenseId}, but no such expense found.`);
            }
            resolve({ id: expenseId, changes: this.changes });
        });
    });
});

ipcMain.handle('get-dashboard-data', async (event, month) => {
  const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
  const dbGet = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

  const daily = await dbAll(`
    SELECT strftime('%d', date) AS day, SUM(amount) AS income
    FROM income
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY day ORDER BY day
  `, [month]);

  const summary = await dbGet(`
    SELECT SUM(amount) AS income
    FROM income
    WHERE strftime('%Y-%m', date) = ?
  `, [month]);

  const topProducts = await dbAll(`
    SELECT item AS name, SUM(amount) AS total
    FROM income
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY item ORDER BY total DESC LIMIT 5
  `, [month]);

  return { daily, summary, topProducts };
});

// Report Table
ipcMain.handle('get-report-data', async (event, filters) => {
  const { date, billNumber } = filters;

  let query = `SELECT * FROM income WHERE 1=1`;
  const params = [];

  if (date) {
    query += ` AND date = ?`;
    params.push(date);
  }
  if (billNumber) {
    query += ` AND bill_number LIKE ?`;
    params.push(`%${billNumber}%`);
  }

  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

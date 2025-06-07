const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, dbAll, dbGet } = require('./db/db');


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
        db.run(
            "INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)",
            [name, quantity, price],
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
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `INSERT INTO bills (bill_number, items, total_amount, received_amount, change_amount, created_at) 
                 VALUES (?, ?, ?, ?, ?, strftime('%d-%m-%Y', 'now', 'localtime'))`,
                [
                    billNumber,
                    items.map(item => `${item.productName} (${item.quantity})`).join(', '),
                    totalAmount,
                    receivedAmount,
                    changeAmount
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
            `SELECT id, bill_number, items, total_amount, created_at 
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
    const { date, item, amount } = expenseData;

    db.run(
      `INSERT INTO expense (date, item, amount) VALUES (?, ?, ?)`,
      [date, item, amount],
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
    db.all(`SELECT date, item, amount FROM expense ORDER BY date DESC`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-dashboard-data', async (e, month) => {
  const daily = await dbAll(
    `SELECT strftime('%d', date) AS day, SUM(amount) AS income
     FROM income
     WHERE strftime('%Y-%m', date) = ?
     GROUP BY day ORDER BY day`, [month]);
  const summary = await dbGet(
    `SELECT SUM(amount) AS income
     FROM income WHERE strftime('%Y-%m', date) = ?`, [month]);

  const topProducts = await dbAll(
    `SELECT item AS name, SUM(amount) AS total
     FROM income
     WHERE strftime('%Y-%m', date) = ?
     GROUP BY item ORDER BY total DESC LIMIT 5`, [month]);

  return { daily, summary, topProducts };
});



ipcMain.handle('get-monthly-summary', async () => {
  return dbAll(
    `SELECT strftime('%Y-%m', date) AS month,
            SUM(income) AS income,
            SUM(income - cost) AS profit
     FROM income
     GROUP BY month
     ORDER BY month DESC`);
});


const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db/db');

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

handleIpc('add-product', (_, name, sellPrice) => {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO products (name, quantity, price) VALUES (?, ?,?)",
            [name, sellPrice],
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

handleIpc('add-income', (_, entries) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO income_entries (date, product_name, quantity, sell_price) VALUES (?, ?, ?, ?)`);
        db.serialize(() => {
            entries.forEach(e => stmt.run(e.date, e.product_name, e.quantity, e.sell_price));
            stmt.finalize((err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
});

handleIpc('save-monthly-cost', (_, { month, cost_total }) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO monthly_costs (month, cost_total)
            VALUES (?, ?)
            ON CONFLICT(month) DO UPDATE SET cost_total = excluded.cost_total`,
            [month, cost_total],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
});

handleIpc('get-summary', () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT month, cost_total FROM monthly_costs ORDER BY month DESC", (err, costRows) => {
            if (err) return reject(err);
            const costMap = Object.fromEntries(costRows.map(r => [r.month, r.cost_total]));

            db.all(`
                SELECT strftime('%Y-%m', date) as month, 
                       SUM(quantity * sell_price) as total_revenue
                FROM income_entries
                GROUP BY strftime('%Y-%m', date)
            `, (err, incomeRows) => {
                if (err) return reject(err);
                const incomeMap = Object.fromEntries(incomeRows.map(r => [r.month, r.total_revenue]));
                const allMonths = [...new Set([...Object.keys(costMap), ...Object.keys(incomeMap)])];
                const result = allMonths.sort((a, b) => b.localeCompare(a)).map(month => ({
                    month,
                    total_cost: costMap[month] || 0,
                    total_revenue: incomeMap[month] || 0,
                    profit: (incomeMap[month] || 0) - (costMap[month] || 0)
                }));

                resolve(result);
            });
        });
    });
});

handleIpc('get-dashboard-data', (_, { month }) => {
    const [year, mon] = month.split('-');
    const startOfMonth = `${month}-01`;
    const endOfMonth = new Date(year, parseInt(mon), 0 + 1).toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
        db.all(`
            SELECT strftime('%Y-%m', date) AS label,
                   SUM(quantity * sell_price) AS income
            FROM income_entries
            GROUP BY label
            ORDER BY label
        `, (err, monthlyRowsRaw) => {
            if (err) return reject(err);

            db.get("SELECT cost_total FROM monthly_costs WHERE month = ?", [month], (err, costRow) => {
                if (err) return reject(err);
                const costTotal = costRow ? Number(costRow.cost_total) : 0;

                const monthlyRows = monthlyRowsRaw.map(row => ({
                    label: row.label,
                    income: Number(row.income),
                    cost: costTotal,
                    profit: Number(row.income) - costTotal
                }));

                db.all(`
                    SELECT strftime('%d', date) AS label,
                           SUM(quantity * sell_price) AS income
                    FROM income_entries
                    WHERE date BETWEEN ? AND ?
                    GROUP BY label
                    ORDER BY label
                `, [startOfMonth, endOfMonth], (err, dailyRows) => {
                    if (err) return reject(err);

                    const completeDaily = Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        const found = dailyRows.find(r => Number(r.label) === day);
                        const income = found ? Number(found.income) : 0;
                        return {
                            label: String(day).padStart(2, '0'),
                            income,
                            profit: income
                        };
                    });

                    resolve({
                        monthlySummary: monthlyRows,
                        dailySummary: completeDaily
                    });
                });
            });
        });
    });
});

handleIpc('get-top-products', (_, { month }) => {
    const start = `${month}-01`;
    const end = new Date(...month.split('-'), 0 + 1).toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
        db.all(`
            SELECT product_name AS label, SUM(quantity) AS quantity
            FROM income_entries
            WHERE date BETWEEN ? AND ?
            GROUP BY product_name
            ORDER BY quantity DESC
        `, [start, end], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
});


ipcMain.handle('get-income-entries', async (event, month) => {
    const where = month ? `WHERE date LIKE '${month}%'` : '';
    const sql = `SELECT * FROM income_entries ${where} ORDER BY date DESC`;

    console.log("📄 SQL:", sql); // ตรวจดูว่า query ถูก
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) {
                console.error("❌ Query error:", err);
                reject(err);
            } else {
                console.log("📥 Rows:", rows);
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('delete-income-entry', async (event, id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM income_entries WHERE id = ?`, [id], function (err) {
            if (err) {
                console.error("❌ ลบไม่สำเร็จ:", err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
});


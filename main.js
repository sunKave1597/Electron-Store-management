const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, dbAll, dbGet, getTotalIncomeDB, getTotalExpensesDB, getReportDataDB } = require('./db/db');

let currentUserSession = null;
let mainWindow = null; // To store the main window instance

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));
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

// Promise wrapper for db.run
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('DB Run Error:', err, 'SQL:', sql, 'Params:', params);
                reject(err);
            } else {
                resolve(this); // 'this' contains lastID and changes
            }
        });
    });
};

handleIpc('create-bill', async (_, billData) => {
    const { billNumber, totalAmount, receivedAmount, changeAmount, items } = billData;
    const dbDate = getFormattedDate();

    try {
        await dbRun('BEGIN TRANSACTION');

        const billInsertResult = await dbRun(
            `INSERT INTO bills (bill_number, items, total_amount, received_amount, change_amount, date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                billNumber,
                items.map(item => `${item.productName} (${item.quantity})`).join(', '),
                totalAmount,
                receivedAmount,
                changeAmount,
                dbDate,
            ]
        );

        const billId = billInsertResult.lastID;

        for (const item of items) {
            await dbRun(
                `INSERT INTO bill_items (bill_id, product_id, product_name, price, quantity, total) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [billId, item.productId, item.productName, item.price, item.quantity, item.total]
            );

            // Stock update logic
            const productRow = await dbGet('SELECT quantity FROM products WHERE id = ?', [item.productId]);
            if (!productRow) {
                await dbRun('ROLLBACK');
                throw new Error(`สินค้าไม่พบ: ${item.productName} (ID: ${item.productId})`);
            }

            const currentQuantity = productRow.quantity;
            const newQuantity = currentQuantity - item.quantity;

            if (newQuantity < 0) {
                await dbRun('ROLLBACK');
                throw new Error(
                    `สินค้าในคลังไม่เพียงพอสำหรับ: ${item.productName}. ที่มีอยู่: ${currentQuantity}, ต้องการ: ${item.quantity}`
                );
            }

            const updateResult = await dbRun('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, item.productId]);
            if (updateResult.changes === 0) {
                await dbRun('ROLLBACK');
                throw new Error(`ล้มเหลวในการอัปเดตสต็อกสำหรับสินค้า: ${item.productName} (ID: ${item.productId})`);
            }
        }

        await dbRun('COMMIT');
        return { billId };

    } catch (error) {
        // Ensure rollback is attempted if not already done by specific error handling
        try {
            await dbRun('ROLLBACK'); // This might fail if already rolled back, but it's a safeguard
        } catch (rollbackError) {
            console.error('Rollback error after initial error:', rollbackError);
        }
        console.error('Error in create-bill, transaction rolled back:', error.message);
        // Re-throw the original error to be caught by handleIpc
        throw error;
    }
});

// Search Bills Handler
ipcMain.handle('search-bills', async (event, { date, billNumber }) => {
    try {
        let query = `SELECT id, bill_number, items, total_amount, date, created_at FROM bills WHERE 1=1`;
        const params = [];

        if (date) {
            query += ` AND date = ?`;
            params.push(date);
        }

        if (billNumber && billNumber.trim() !== '') {
            query += ` AND bill_number LIKE ?`;
            params.push(`%${billNumber.trim()}%`);
        }

        query += ` ORDER BY created_at DESC`;

        // Assuming dbAll is available and promise-based from db/db.js
        // If dbAll is not available in this scope directly from require('./db/db'), 
        // it might need to be defined locally like dbRun or ensured it's exported and imported correctly.
        // For this exercise, assuming dbAll from const { ..., dbAll, ... } = require('./db/db'); works.
        const rows = await dbAll(query, params);
        return rows;
    } catch (error) {
        console.error('Error searching bills:', error);
        throw error; // Re-throw to be caught by handleIpc generic error handler
    }
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

    // 1. รายได้รายวัน
    const daily = await dbAll(`
    SELECT strftime('%d', date) AS day, SUM(total_amount) AS income
    FROM bills
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY day
    ORDER BY day
  `, [month]);

    // 2. ยอดรวมรายเดือน
    const summary = await dbGet(`
    SELECT SUM(total_amount) AS income
    FROM bills
    WHERE strftime('%Y-%m', date) = ?
  `, [month]);

    // 3. สินค้าขายดี
    const topProducts = await dbAll(`
    SELECT product_name AS name, SUM(quantity) AS total
    FROM bill_items
    WHERE bill_id IN (
      SELECT id FROM bills WHERE strftime('%Y-%m', date) = ?
    )
    GROUP BY product_name
    ORDER BY total DESC
    LIMIT 5
  `, [month]);

    const cost = await dbGet(`
    SELECT SUM(amount) AS total
    FROM expense
    WHERE strftime('%Y-%m', date) = ?
  `, [month]);

    return { daily, summary, topProducts, cost };
});

ipcMain.handle('get-report-data', async (event, filters) => {
  const { startMonth, endMonth } = filters;
  const params = [];
  let whereClause = "";

  if (startMonth && endMonth) {
    whereClause = `
      WHERE strftime('%Y-%m', b.date) BETWEEN ? AND ?
    `;
    params.push(startMonth, endMonth);
  }

  const rows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        strftime('%Y-%m', b.date) AS month,
        COUNT(DISTINCT b.id) AS bill_count,
        SUM(b.total_amount) AS total_income,
        SUM(bi.total * 0.4) AS total_cost,
        SUM(b.total_amount - (bi.total * 0.4)) AS total_profit
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      ${whereClause}
      GROUP BY month
      ORDER BY month DESC
    `, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  return rows;
});


// Get Current User Session Handler
ipcMain.handle('get-current-user-session', () => {
    console.log('Returning current session:', currentUserSession);
    return currentUserSession;
});

// Handle user login
ipcMain.handle('login-user', async (_, credentials) => {
    const { username, password } = credentials;

    try {
        // Fetch user from database
        const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);

        if (!user) {
            throw new Error("ไม่พบผู้ใช้");
        }

        if (password !== user.password) {
            throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // Set current user session
        currentUserSession = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        console.log('Login successful:', currentUserSession);
        return { success: true, ...currentUserSession };
    } catch (err) {
        console.error("Login failed:", err.message || err);
        return { success: false, message: err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
    }
});

// Logout User Handler
ipcMain.handle('logout-user', () => {
    console.log('Logging out user. Current session before logout:', currentUserSession);
    currentUserSession = null;
    console.log('Session after logout:', currentUserSession);
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));
    }
    return { success: true };
});

// Navigate to page handler
ipcMain.handle('navigate-to-page', async (event, pageUrl) => {
    if (!mainWindow) {
        console.error('Error navigating to page: mainWindow is not defined.');
        return { success: false, message: 'Main window is not available.' };
    }

    const userRole = currentUserSession ? currentUserSession.role : null;
    const pageFilename = pageUrl; // Assuming pageUrl is just the filename like 'store.html'

    // Define page access rules
    const pageAccessRules = {
        'admin': ['store.html', 'report.html', 'management.html', 'dashboard.html', 'expense.html', 'login.html', 'bill-history.html', 'bill-detail.html'], // Admin can access all pages
        'staff': ['store.html', 'report.html', 'login.html', 'stock.html', 'expense.html', 'bill-history.html', 'bill-detail.html'] // Staff can access store and report pages
        // Add other roles and their accessible pages here
    };

    const authorizedPages = pageAccessRules[userRole] || [];

    if (userRole === 'admin' || authorizedPages.includes(pageFilename)) {
        try {
            await mainWindow.loadFile(path.join(__dirname, 'pages', pageFilename));
            console.log(`User [${userRole}] navigated to ${pageFilename}`);
            return { success: true, userRole: userRole };
        } catch (error) {
            console.error(`Error loading page ${pageFilename}:`, error);
            return { success: false, message: `Failed to load page: ${error.message}` };
        }
    } else {
        console.log(`User [${userRole}] is not authorized to access ${pageFilename}.`);
        return { success: false, message: 'Access Denied. You do not have permission to view this page.' };
    }
});

ipcMain.handle('update-product-quantity', async (event, productId, newQuantity) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE products SET quantity = ? WHERE id = ?`,
      [newQuantity, productId],
      function (err) {
        if (err) {
          console.error('Error updating quantity:', err);
          reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});


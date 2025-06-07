const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (name, quantity, price) => ipcRenderer.invoke('add-product', name, quantity, price),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    createBill: (billData) => ipcRenderer.invoke('create-bill', billData),
    getBills: () => ipcRenderer.invoke('get-bills'),
    getBillDetail: (billId) => ipcRenderer.invoke('get-bill-detail', billId),
    deleteBill: (billId) => ipcRenderer.invoke('delete-bill', billId),
    addExpense: (expenseData) => ipcRenderer.invoke('add-expense', expenseData),
    getExpenses: () => ipcRenderer.invoke('get-expenses'),
    deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
    getDashboardData: (month) => ipcRenderer.invoke('get-dashboard-data', month),
    getMonthlySummary: () => ipcRenderer.invoke('get-monthly-summary'),
    getTotalIncome: () => ipcRenderer.invoke('get-total-income'),
    getTotalExpenses: () => ipcRenderer.invoke('get-total-expenses'),
    getReportData: (month) => ipcRenderer.invoke('get-report-data', month)
});

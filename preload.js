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
  getMonthlySummary: () => ipcRenderer.invoke('get-monthly-summary'),
  getTotalIncome: () => ipcRenderer.invoke('get-total-income'),
  getTotalExpenses: () => ipcRenderer.invoke('get-total-expenses'),
  getDashboardData: (month) => ipcRenderer.invoke('get-dashboard-data', month),
  getReportData: (filters) => ipcRenderer.invoke('get-report-data', filters),
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  navigateToPage: (pageUrl) => ipcRenderer.invoke('navigate-to-page', pageUrl),
  getCurrentUserSession: () => ipcRenderer.invoke('get-current-user-session'),
  logoutUser: () => ipcRenderer.invoke('logout-user'),
  searchBills: (criteria) => ipcRenderer.invoke('search-bills', criteria), 
  updateProductQuantity: (id, quantity) => ipcRenderer.invoke('update-product-quantity', id, quantity)

});

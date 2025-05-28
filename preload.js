const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (name, sell) => ipcRenderer.invoke('add-product', name, sell),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    addIncome: (entries) => ipcRenderer.invoke('add-income', entries),
    getSummary: () => ipcRenderer.invoke('get-summary'),
    getDashboardData: (month) => ipcRenderer.invoke('get-dashboard-data', { month }),
    getTopProducts: (month) => ipcRenderer.invoke('get-top-products', { month }),
    saveMonthlyCost: (month, cost_total) => ipcRenderer.invoke('save-monthly-cost', { month, cost_total }),
    getIncomeEntries: (month) => ipcRenderer.invoke('get-income-entries', month),
    deleteIncomeEntry: (id) => ipcRenderer.invoke('delete-income-entry', id)

});
